import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Price } from '@app/shared/value-objects';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateCustomerServicePlanDto,
  UpdateCustomerServicePlanDto,
} from '../dto/requests/customer-service-plan.dto';

@Injectable()
export class CreateCustomerServicePlanUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CreateCustomerServicePlanDto, user: CurrentUser) {
    const businessId = this.getBusinessId(user);
    await this.validateItems(businessId, dto.service_ids, dto.combo_ids);

    const credits = Number(dto.credits_per_cycle);
    const maxFutureBookings = dto.max_future_bookings ?? credits;

    const plan = await this.prisma.customerServicePlan.create({
      data: {
        businessId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        price_in_cents: dto.price_in_cents,
        cycle_type: dto.cycle_type ?? 'ROLLING_FROM_START',
        cycle_interval_months: dto.cycle_interval_months ?? 1,
        credits_per_cycle: credits,
        max_uses_per_week: dto.max_uses_per_week ?? 1,
        allow_multiple_uses_same_week:
          dto.allow_multiple_uses_same_week ?? false,
        min_days_between_uses: dto.min_days_between_uses ?? 0,
        max_future_bookings: maxFutureBookings,
        booking_window_days: dto.booking_window_days ?? 31,
        allow_client_recurring_booking:
          dto.allow_client_recurring_booking ?? true,
        allow_client_single_booking: dto.allow_client_single_booking ?? true,
        created_by_user_id: user.id,
        services: dto.service_ids?.length
          ? {
              createMany: {
                data: dto.service_ids.map((serviceId) => ({ serviceId })),
                skipDuplicates: true,
              },
            }
          : undefined,
        combos: dto.combo_ids?.length
          ? {
              createMany: {
                data: dto.combo_ids.map((serviceComboId) => ({
                  serviceComboId,
                })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: planInclude,
    });

    return presentPlan(plan);
  }

  private getBusinessId(user: CurrentUser) {
    if (!user?.current_selected_business_id) {
      throw new UnauthorizedException('Usuário sem negócio selecionado.');
    }
    return user.current_selected_business_id;
  }

  private async validateItems(
    businessId: string,
    serviceIds: string[] = [],
    comboIds: string[] = [],
  ) {
    if (!serviceIds.length && !comboIds.length) {
      throw new BadRequestException(
        'Informe ao menos um serviço ou combo para o plano.',
      );
    }

    const [servicesCount, combosCount] = await Promise.all([
      serviceIds.length
        ? this.prisma.service.count({
            where: { id: { in: serviceIds }, businessId, is_active: true },
          })
        : Promise.resolve(0),
      comboIds.length
        ? this.prisma.serviceCombo.count({
            where: {
              id: { in: comboIds },
              businessId,
              is_active: true,
              deleted_at: null,
            },
          })
        : Promise.resolve(0),
    ]);

    if (servicesCount !== serviceIds.length || combosCount !== comboIds.length) {
      throw new BadRequestException(
        'Existem serviços ou combos inválidos para este negócio.',
      );
    }
  }
}

@Injectable()
export class ListCustomerServicePlansUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(user: CurrentUser) {
    if (!user?.current_selected_business_id) {
      throw new UnauthorizedException('Usuário sem negócio selecionado.');
    }

    const plans = await this.prisma.customerServicePlan.findMany({
      where: {
        businessId: user.current_selected_business_id,
        status: { not: 'ARCHIVED' },
      },
      orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
      include: planInclude,
    });

    return plans.map(presentPlan);
  }
}

@Injectable()
export class UpdateCustomerServicePlanUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, dto: UpdateCustomerServicePlanDto, user: CurrentUser) {
    if (!user?.current_selected_business_id) {
      throw new UnauthorizedException('Usuário sem negócio selecionado.');
    }

    const existing = await this.prisma.customerServicePlan.findFirst({
      where: { id, businessId: user.current_selected_business_id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Plano não encontrado.');

    const serviceIds = dto.service_ids ?? [];
    const comboIds = dto.combo_ids ?? [];
    if (dto.service_ids || dto.combo_ids) {
      await this.validateItems(
        user.current_selected_business_id,
        serviceIds,
        comboIds,
      );
    }

    const plan = await this.prisma.$transaction(async (tx) => {
      if (dto.service_ids || dto.combo_ids) {
        await Promise.all([
          tx.customerServicePlanService.deleteMany({ where: { planId: id } }),
          tx.customerServicePlanCombo.deleteMany({ where: { planId: id } }),
        ]);
      }

      return tx.customerServicePlan.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description:
            dto.description === undefined ? undefined : dto.description || null,
          price_in_cents: dto.price_in_cents,
          cycle_type: dto.cycle_type,
          cycle_interval_months: dto.cycle_interval_months,
          credits_per_cycle: dto.credits_per_cycle,
          max_uses_per_week: dto.max_uses_per_week,
          allow_multiple_uses_same_week:
            dto.allow_multiple_uses_same_week,
          min_days_between_uses: dto.min_days_between_uses,
          max_future_bookings: dto.max_future_bookings,
          booking_window_days: dto.booking_window_days,
          allow_client_recurring_booking:
            dto.allow_client_recurring_booking,
          allow_client_single_booking: dto.allow_client_single_booking,
          status: dto.status,
          updated_by_user_id: user.id,
          services: dto.service_ids
            ? {
                createMany: {
                  data: serviceIds.map((serviceId) => ({ serviceId })),
                  skipDuplicates: true,
                },
              }
            : undefined,
          combos: dto.combo_ids
            ? {
                createMany: {
                  data: comboIds.map((serviceComboId) => ({
                    serviceComboId,
                  })),
                  skipDuplicates: true,
                },
              }
            : undefined,
        },
        include: planInclude,
      });
    });

    return presentPlan(plan);
  }

  private async validateItems(
    businessId: string,
    serviceIds: string[],
    comboIds: string[],
  ) {
    if (!serviceIds.length && !comboIds.length) {
      throw new BadRequestException(
        'Informe ao menos um serviço ou combo para o plano.',
      );
    }

    const [servicesCount, combosCount] = await Promise.all([
      serviceIds.length
        ? this.prisma.service.count({
            where: { id: { in: serviceIds }, businessId, is_active: true },
          })
        : Promise.resolve(0),
      comboIds.length
        ? this.prisma.serviceCombo.count({
            where: {
              id: { in: comboIds },
              businessId,
              is_active: true,
              deleted_at: null,
            },
          })
        : Promise.resolve(0),
    ]);

    if (servicesCount !== serviceIds.length || combosCount !== comboIds.length) {
      throw new BadRequestException(
        'Existem serviços ou combos inválidos para este negócio.',
      );
    }
  }
}

const planInclude = {
  services: {
    select: {
      service: {
        select: { id: true, name: true, duration: true, price_in_cents: true },
      },
    },
  },
  combos: {
    select: {
      serviceCombo: {
        select: {
          id: true,
          name: true,
          final_duration_minutes: true,
          final_price_in_cents: true,
        },
      },
    },
  },
  _count: { select: { subscriptions: true } },
} satisfies Prisma.CustomerServicePlanInclude;

function presentPlan(plan: Prisma.CustomerServicePlanGetPayload<{
  include: typeof planInclude;
}>) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    status: plan.status,
    price_in_cents: plan.price_in_cents,
    price: new Price(plan.price_in_cents).toCurrency(),
    cycle_type: plan.cycle_type,
    cycle_interval_months: plan.cycle_interval_months,
    credits_per_cycle: plan.credits_per_cycle,
    max_uses_per_week: plan.max_uses_per_week,
    allow_multiple_uses_same_week: plan.allow_multiple_uses_same_week,
    min_days_between_uses: plan.min_days_between_uses,
    max_future_bookings: plan.max_future_bookings,
    booking_window_days: plan.booking_window_days,
    allow_client_recurring_booking: plan.allow_client_recurring_booking,
    allow_client_single_booking: plan.allow_client_single_booking,
    subscriptions_count: plan._count.subscriptions,
    services: plan.services.map(({ service }) => ({
      id: service.id,
      name: service.name,
      duration: service.duration,
      price_in_cents: service.price_in_cents,
      price: new Price(service.price_in_cents).toCurrency(),
    })),
    combos: plan.combos.map(({ serviceCombo }) => ({
      id: serviceCombo.id,
      name: serviceCombo.name,
      duration: serviceCombo.final_duration_minutes,
      price_in_cents: serviceCombo.final_price_in_cents,
      price: new Price(serviceCombo.final_price_in_cents).toCurrency(),
    })),
    created_at: plan.created_at,
    updated_at: plan.updated_at,
  };
}
