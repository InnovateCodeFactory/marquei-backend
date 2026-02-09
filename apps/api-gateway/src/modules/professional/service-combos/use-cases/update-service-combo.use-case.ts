import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { hasProhibitedTerm } from '@app/shared/utils';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ServiceComboDurationModeDto,
  ServiceComboPricingModeDto,
  UpdateServiceComboDto,
} from '../dto/requests';
import { presentServiceCombo } from '../utils/service-combo.presenter';
import {
  assertMinComboServices,
  computeComboValues,
  normalizeComboServiceIds,
  normalizeOptionalString,
} from '../utils/service-combo.utils';

@Injectable()
export class UpdateServiceComboUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(currentUser: CurrentUser, comboId: string, dto: UpdateServiceComboDto) {
    const businessId = currentUser?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('Nenhum negócio selecionado');

    const combo = await this.prisma.serviceCombo.findFirst({
      where: {
        id: comboId,
        businessId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        pricing_mode: true,
        duration_mode: true,
        discount_percent: true,
        fixed_price_in_cents: true,
        custom_duration_minutes: true,
        base_price_in_cents: true,
        base_duration_minutes: true,
        final_price_in_cents: true,
        final_duration_minutes: true,
        items: {
          orderBy: { sort_order: 'asc' },
          select: {
            serviceId: true,
            sort_order: true,
            price_in_cents_snapshot: true,
            duration_minutes_snapshot: true,
          },
        },
      },
    });

    if (!combo) throw new NotFoundException('Combo não encontrado');

    const normalizedName = normalizeOptionalString(dto.name);
    if (normalizedName && hasProhibitedTerm(normalizedName, 'service')) {
      throw new BadRequestException(
        'Nome do combo contém termos não permitidos',
      );
    }

    if (
      normalizedName &&
      normalizedName.toLowerCase() !== combo.name.trim().toLowerCase()
    ) {
      const conflict = await this.prisma.serviceCombo.findFirst({
        where: {
          id: { not: combo.id },
          businessId,
          deleted_at: null,
          name: { equals: normalizedName, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException('Já existe um combo com este nome');
      }
    }

    let nextServiceItems = combo.items.map((item) => ({
      serviceId: item.serviceId,
      sort_order: item.sort_order,
      price_in_cents_snapshot: item.price_in_cents_snapshot,
      duration_minutes_snapshot: item.duration_minutes_snapshot,
    }));

    if (dto.service_ids) {
      const serviceIds = normalizeComboServiceIds(dto.service_ids);
      assertMinComboServices(serviceIds);

      const services = await this.prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          businessId,
          is_active: true,
        },
        select: {
          id: true,
          duration: true,
          price_in_cents: true,
        },
      });

      if (services.length !== serviceIds.length) {
        throw new BadRequestException(
          'Um ou mais serviços são inválidos para este negócio',
        );
      }

      const serviceMap = new Map(services.map((service) => [service.id, service]));
      nextServiceItems = serviceIds.map((serviceId, index) => {
        const service = serviceMap.get(serviceId)!;
        return {
          serviceId: service.id,
          sort_order: index,
          price_in_cents_snapshot: service.price_in_cents,
          duration_minutes_snapshot: service.duration,
        };
      });
    }

    const nextBasePriceInCents = nextServiceItems.reduce(
      (sum, item) => sum + item.price_in_cents_snapshot,
      0,
    );
    const nextBaseDurationMinutes = nextServiceItems.reduce(
      (sum, item) => sum + item.duration_minutes_snapshot,
      0,
    );

    const nextPricingMode =
      dto.pricing_mode ??
      (combo.pricing_mode as ServiceComboPricingModeDto);
    const nextDurationMode =
      dto.duration_mode ??
      (combo.duration_mode as ServiceComboDurationModeDto);

    const nextFixedPriceInCents =
      dto.fixed_price_in_cents ??
      (nextPricingMode === ServiceComboPricingModeDto.FIXED_PRICE
        ? combo.fixed_price_in_cents ?? combo.final_price_in_cents
        : null);

    const nextDiscountPercent =
      dto.discount_percent ??
      (nextPricingMode === ServiceComboPricingModeDto.PERCENT_DISCOUNT
        ? combo.discount_percent ?? 0
        : null);

    const nextCustomDurationMinutes =
      dto.custom_duration_minutes ??
      (nextDurationMode === ServiceComboDurationModeDto.CUSTOM
        ? combo.custom_duration_minutes ?? combo.final_duration_minutes
        : null);

    const computed = computeComboValues({
      pricingMode: nextPricingMode,
      durationMode: nextDurationMode,
      basePriceInCents: nextBasePriceInCents,
      baseDurationMinutes: nextBaseDurationMinutes,
      fixedPriceInCents: nextFixedPriceInCents,
      discountPercent: nextDiscountPercent,
      customDurationMinutes: nextCustomDurationMinutes,
    });

    const updatedCombo = await this.prisma.$transaction(async (tx) => {
      await tx.serviceCombo.update({
        where: { id: combo.id },
        data: {
          ...(normalizedName ? { name: normalizedName } : {}),
          ...(dto.description !== undefined
            ? { description: normalizeOptionalString(dto.description) }
            : {}),
          ...(dto.color !== undefined
            ? { color: normalizeOptionalString(dto.color) ?? '#4647fa' }
            : {}),
          ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
          pricing_mode: nextPricingMode,
          duration_mode: nextDurationMode,
          fixed_price_in_cents: computed.fixed_price_in_cents,
          discount_percent: computed.discount_percent,
          custom_duration_minutes: computed.custom_duration_minutes,
          base_price_in_cents: computed.base_price_in_cents,
          base_duration_minutes: computed.base_duration_minutes,
          final_price_in_cents: computed.final_price_in_cents,
          final_duration_minutes: computed.final_duration_minutes,
          updated_by:
            currentUser?.id && currentUser.id !== ''
              ? { connect: { id: currentUser.id } }
              : undefined,
        },
      });

      if (dto.service_ids) {
        await tx.serviceComboItem.deleteMany({
          where: { comboId: combo.id },
        });
        await tx.serviceComboItem.createMany({
          data: nextServiceItems.map((item) => ({
            comboId: combo.id,
            serviceId: item.serviceId,
            sort_order: item.sort_order,
            price_in_cents_snapshot: item.price_in_cents_snapshot,
            duration_minutes_snapshot: item.duration_minutes_snapshot,
          })),
        });
      }

      return tx.serviceCombo.findUnique({
        where: { id: combo.id },
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          is_active: true,
          pricing_mode: true,
          duration_mode: true,
          discount_percent: true,
          fixed_price_in_cents: true,
          custom_duration_minutes: true,
          base_price_in_cents: true,
          base_duration_minutes: true,
          final_price_in_cents: true,
          final_duration_minutes: true,
          created_at: true,
          updated_at: true,
          items: {
            orderBy: { sort_order: 'asc' },
            select: {
              sort_order: true,
              price_in_cents_snapshot: true,
              duration_minutes_snapshot: true,
              service: {
                select: { id: true, name: true, is_active: true },
              },
            },
          },
        },
      });
    });

    if (!updatedCombo) throw new NotFoundException('Combo não encontrado');

    return presentServiceCombo(updatedCombo);
  }
}
