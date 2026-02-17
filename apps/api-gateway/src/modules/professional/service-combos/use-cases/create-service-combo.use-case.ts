import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { hasProhibitedTerm } from '@app/shared/utils';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateServiceComboDto } from '../dto/requests';
import { presentServiceCombo } from '../utils/service-combo.presenter';
import {
  assertMinComboServices,
  computeComboValues,
  normalizeComboServiceIds,
  normalizeOptionalString,
} from '../utils/service-combo.utils';

@Injectable()
export class CreateServiceComboUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(currentUser: CurrentUser, dto: CreateServiceComboDto) {
    const businessId = currentUser?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('Nenhum negócio selecionado');

    const name = normalizeOptionalString(dto.name);
    if (!name) throw new BadRequestException('Nome do combo é obrigatório');

    if (hasProhibitedTerm(name, 'service')) {
      throw new BadRequestException(
        'Nome do combo contém termos não permitidos',
      );
    }

    const serviceIds = normalizeComboServiceIds(dto.service_ids);
    assertMinComboServices(serviceIds);
    const selectedProfessionals = Array.isArray(dto.professionalsId)
      ? Array.from(new Set(dto.professionalsId.filter(Boolean)))
      : [];

    if (!selectedProfessionals.length) {
      throw new BadRequestException(
        'Selecione ao menos um profissional para executar este combo',
      );
    }

    const [conflict, services, professionalsCount] = await Promise.all([
      this.prisma.serviceCombo.findFirst({
        where: {
          businessId,
          deleted_at: null,
          name: { equals: name, mode: 'insensitive' },
        },
        select: { id: true },
      }),
      this.prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          businessId,
          is_active: true,
        },
        select: {
          id: true,
          name: true,
          duration: true,
          price_in_cents: true,
          is_active: true,
        },
      }),
      this.prisma.professionalProfile.count({
        where: {
          id: { in: selectedProfessionals },
          business_id: businessId,
          status: 'ACTIVE',
        },
      }),
    ]);

    if (conflict) {
      throw new ConflictException('Já existe um combo com este nome');
    }

    if (services.length !== serviceIds.length) {
      throw new BadRequestException(
        'Um ou mais serviços são inválidos para este negócio',
      );
    }

    if (professionalsCount !== selectedProfessionals.length) {
      throw new BadRequestException(
        'Um ou mais profissionais são inválidos para este negócio',
      );
    }

    const serviceMap = new Map(services.map((service) => [service.id, service]));
    const orderedServices = serviceIds.map((id) => serviceMap.get(id)!);

    const basePriceInCents = orderedServices.reduce(
      (sum, service) => sum + service.price_in_cents,
      0,
    );
    const baseDurationMinutes = orderedServices.reduce(
      (sum, service) => sum + service.duration,
      0,
    );

    const computed = computeComboValues({
      pricingMode: dto.pricing_mode,
      durationMode: dto.duration_mode,
      basePriceInCents,
      baseDurationMinutes,
      fixedPriceInCents: dto.fixed_price_in_cents,
      discountPercent: dto.discount_percent,
      customDurationMinutes: dto.custom_duration_minutes,
    });

    const combo = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceCombo.create({
        data: {
          business: { connect: { id: businessId } },
          created_by: { connect: { id: currentUser.id } },
          name,
          description: normalizeOptionalString(dto.description),
          color: normalizeOptionalString(dto.color) ?? '#4647fa',
          is_active: dto.is_active ?? true,
          pricing_mode: dto.pricing_mode,
          duration_mode: dto.duration_mode,
          fixed_price_in_cents: computed.fixed_price_in_cents,
          discount_percent: computed.discount_percent,
          custom_duration_minutes: computed.custom_duration_minutes,
          base_price_in_cents: computed.base_price_in_cents,
          base_duration_minutes: computed.base_duration_minutes,
          final_price_in_cents: computed.final_price_in_cents,
          final_duration_minutes: computed.final_duration_minutes,
        },
        select: { id: true },
      });

      await tx.serviceComboItem.createMany({
        data: orderedServices.map((service, index) => ({
          comboId: created.id,
          serviceId: service.id,
          sort_order: index,
          price_in_cents_snapshot: service.price_in_cents,
          duration_minutes_snapshot: service.duration,
        })),
      });

      await tx.professionalServiceCombo.createMany({
        data: selectedProfessionals.map((professionalId) => ({
          professional_profile_id: professionalId,
          service_combo_id: created.id,
          active: true,
        })),
        skipDuplicates: true,
      });

      return tx.serviceCombo.findUnique({
        where: { id: created.id },
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
            select: {
              sort_order: true,
              price_in_cents_snapshot: true,
              duration_minutes_snapshot: true,
              service: {
                select: { id: true, name: true, is_active: true },
              },
            },
          },
          professionals: {
            select: {
              professional_profile_id: true,
              professional_profile: {
                select: {
                  User: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    });

    if (!combo) {
      throw new BadRequestException('Não foi possível criar o combo');
    }

    return presentServiceCombo(combo);
  }
}
