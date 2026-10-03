import { PrismaService } from '@app/shared';
import { CustomerPlanSummaryService } from '@app/shared/services';
import { CustomerPlanSummary, getAvailableCredits } from '@app/shared/utils';
import { CurrentUser } from '@app/shared/types/app-request';
import { Price } from '@app/shared/value-objects';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CustomerServicePlanCycleType, Prisma } from '@prisma/client';
import { addMonths, endOfMonth, startOfMonth, subMilliseconds } from 'date-fns';
import {
  CreateCustomerPlanSubscriptionDto,
  ListCustomerPlanSubscriptionsDto,
} from '../dto/requests/customer-plan-subscription.dto';

@Injectable()
export class CreateCustomerPlanSubscriptionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly summaryService: CustomerPlanSummaryService,
  ) {}

  async execute(dto: CreateCustomerPlanSubscriptionDto, user: CurrentUser) {
    const businessId = getBusinessId(user);

    const [plan, customer, revenueProfessional] = await Promise.all([
      this.prisma.customerServicePlan.findFirst({
        where: { id: dto.plan_id, businessId, status: 'ACTIVE' },
        include: {
          services: { select: { serviceId: true } },
          combos: { select: { serviceComboId: true } },
        },
      }),
      this.prisma.businessCustomer.findFirst({
        where: { id: dto.customer_id, businessId, is_blocked: false },
        select: { id: true, personId: true, person: { select: { name: true } } },
      }),
      this.prisma.professionalProfile.findFirst({
        where: {
          id: dto.revenue_professional_profile_id,
          business_id: businessId,
          status: 'ACTIVE',
        },
        select: { id: true },
      }),
    ]);

    if (!plan) throw new NotFoundException('Plano não encontrado.');
    if (!customer) throw new NotFoundException('Cliente não encontrado.');
    if (!revenueProfessional) {
      throw new BadRequestException('Profissional de receita inválido.');
    }

    const now = new Date();
    const cycle = buildCycleRange({
      now,
      cycleType: plan.cycle_type,
      intervalMonths: plan.cycle_interval_months,
    });
    const rulesSnapshot = buildRulesSnapshot(plan);

    const subscription = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customerPlanSubscription.create({
        data: {
          businessId,
          businessCustomerId: customer.id,
          personId: customer.personId,
          planId: plan.id,
          status: 'ACTIVE',
          started_at: now,
          current_cycle_start: cycle.start,
          current_cycle_end: cycle.end,
          price_in_cents_snapshot: plan.price_in_cents,
          credits_per_cycle_snapshot: plan.credits_per_cycle,
          rules_snapshot: rulesSnapshot,
          sold_by_user_id: user.id,
          revenue_professional_profile_id: revenueProfessional.id,
          cycles: {
            create: {
              businessId,
              cycle_start: cycle.start,
              cycle_end: cycle.end,
              credits_granted: plan.credits_per_cycle,
            },
          },
        },
        include: subscriptionInclude,
      });

      await tx.professionalStatement.create({
        data: {
          businessId,
          professionalProfileId: revenueProfessional.id,
          type: 'INCOME',
          value_in_cents: plan.price_in_cents,
          description: `Plano: ${plan.name} - ${customer.person.name}`,
          customerPlanSubscriptionId: created.id,
        },
      });

      return created;
    });

    return presentOne(this.summaryService, subscription);
  }
}

@Injectable()
export class ListCustomerPlanSubscriptionsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly summaryService: CustomerPlanSummaryService,
  ) {}

  async execute(query: ListCustomerPlanSubscriptionsDto, user: CurrentUser) {
    const businessId = getBusinessId(user);

    const limit = Math.min(Math.max(query.limit ?? 200, 1), 200);
    const page = Math.max(query.page ?? 1, 1);

    const subscriptions = await this.prisma.customerPlanSubscription.findMany({
      where: {
        businessId,
        ...(query.customer_id ? { businessCustomerId: query.customer_id } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: subscriptionInclude,
      orderBy:
        query.sort === 'cycle_end'
          ? [{ current_cycle_end: 'asc' }, { id: 'asc' }]
          : [{ status: 'asc' }, { created_at: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: (page - 1) * limit,
    });

    return presentMany(this.summaryService, subscriptions);
  }
}

@Injectable()
export class RenewCustomerPlanSubscriptionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly summaryService: CustomerPlanSummaryService,
  ) {}

  async execute(id: string, user: CurrentUser) {
    const businessId = getBusinessId(user);
    const subscription = await this.prisma.customerPlanSubscription.findFirst({
      where: { id, businessId },
      include: {
        plan: true,
        businessCustomer: { select: { person: { select: { name: true } } } },
      },
    });

    if (!subscription) throw new NotFoundException('Assinatura não encontrada.');
    if (subscription.status === 'CANCELED') {
      throw new BadRequestException('Assinatura cancelada não pode ser renovada.');
    }

    const now = new Date();
    const cycle = buildCycleRange({
      now,
      cycleType: subscription.plan.cycle_type,
      intervalMonths: subscription.plan.cycle_interval_months,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.customerServicePlanCycle.create({
        data: {
          businessId,
          subscriptionId: subscription.id,
          cycle_start: cycle.start,
          cycle_end: cycle.end,
          credits_granted: subscription.credits_per_cycle_snapshot,
        },
      });

      await tx.professionalStatement.create({
        data: {
          businessId,
          professionalProfileId: subscription.revenue_professional_profile_id,
          type: 'INCOME',
          value_in_cents: subscription.price_in_cents_snapshot,
          description: `Renovação de plano: ${subscription.plan.name} - ${subscription.businessCustomer.person.name}`,
          customerPlanSubscriptionId: subscription.id,
        },
      });

      return tx.customerPlanSubscription.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          current_cycle_start: cycle.start,
          current_cycle_end: cycle.end,
        },
        include: subscriptionInclude,
      });
    });

    return presentOne(this.summaryService, updated);
  }
}

@Injectable()
export class UpdateCustomerPlanSubscriptionStatusUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly summaryService: CustomerPlanSummaryService,
  ) {}

  async execute(
    id: string,
    status: 'ACTIVE' | 'PAUSED' | 'CANCELED',
    user: CurrentUser,
  ) {
    const businessId = getBusinessId(user);
    const subscription = await this.prisma.customerPlanSubscription.findFirst({
      where: { id, businessId },
      select: { id: true },
    });
    if (!subscription) throw new NotFoundException('Assinatura não encontrada.');

    const updated = await this.prisma.customerPlanSubscription.update({
      where: { id },
      data: { status },
      include: subscriptionInclude,
    });

    return presentOne(this.summaryService, updated);
  }
}

const subscriptionInclude = {
  plan: {
    select: {
      id: true,
      name: true,
      services: {
        select: { service: { select: { id: true, name: true } } },
      },
      combos: {
        select: { serviceCombo: { select: { id: true, name: true } } },
      },
    },
  },
  businessCustomer: {
    select: {
      id: true,
      person: { select: { id: true, name: true, phone: true, email: true } },
    },
  },
  cycles: {
    orderBy: { cycle_start: 'desc' },
    take: 1,
    select: {
      id: true,
      cycle_start: true,
      cycle_end: true,
      credits_granted: true,
      credits_reserved: true,
      credits_consumed: true,
      credits_refunded: true,
    },
  },
} satisfies Prisma.CustomerPlanSubscriptionInclude;

function getBusinessId(user: CurrentUser) {
  if (!user?.current_selected_business_id) {
    throw new UnauthorizedException('Usuário sem negócio selecionado.');
  }
  return user.current_selected_business_id;
}

function buildCycleRange({
  now,
  cycleType,
  intervalMonths,
}: {
  now: Date;
  cycleType: CustomerServicePlanCycleType;
  intervalMonths: number;
}) {
  if (cycleType === 'CALENDAR_MONTH') {
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }

  return {
    start: now,
    end: subMilliseconds(addMonths(now, Math.max(1, intervalMonths)), 1),
  };
}

function buildRulesSnapshot(plan: {
  max_uses_per_week: number;
  allow_multiple_uses_same_week: boolean;
  min_days_between_uses: number;
  max_future_bookings: number;
  booking_window_days: number;
  allow_client_recurring_booking: boolean;
  allow_client_single_booking: boolean;
}) {
  return {
    max_uses_per_week: plan.max_uses_per_week,
    allow_multiple_uses_same_week: plan.allow_multiple_uses_same_week,
    min_days_between_uses: plan.min_days_between_uses,
    max_future_bookings: plan.max_future_bookings,
    booking_window_days: plan.booking_window_days,
    allow_client_recurring_booking: plan.allow_client_recurring_booking,
    allow_client_single_booking: plan.allow_client_single_booking,
  };
}

async function presentOne(
  summaryService: CustomerPlanSummaryService,
  subscription: SubscriptionWithInclude,
) {
  const [presented] = await presentMany(summaryService, [subscription]);
  return presented;
}

async function presentMany(
  summaryService: CustomerPlanSummaryService,
  subscriptions: SubscriptionWithInclude[],
) {
  const summaries = await summaryService.summarize(
    subscriptions.map((subscription) => ({
      id: subscription.id,
      current_cycle_end: subscription.current_cycle_end,
      cycle: subscription.cycles[0]
        ? {
            id: subscription.cycles[0].id,
            credits_granted: subscription.cycles[0].credits_granted,
            credits_reserved: subscription.cycles[0].credits_reserved,
            credits_consumed: subscription.cycles[0].credits_consumed,
            credits_refunded: subscription.cycles[0].credits_refunded,
          }
        : null,
    })),
  );

  return subscriptions.map((subscription) =>
    presentSubscription(subscription, summaries.get(subscription.id)),
  );
}

type SubscriptionWithInclude = Prisma.CustomerPlanSubscriptionGetPayload<{
  include: typeof subscriptionInclude;
}>;

function presentSubscription(
  subscription: SubscriptionWithInclude,
  summary?: CustomerPlanSummary,
) {
  const cycle = subscription.cycles[0] ?? null;

  return {
    id: subscription.id,
    status: subscription.status,
    price_in_cents: subscription.price_in_cents_snapshot,
    price: new Price(subscription.price_in_cents_snapshot).toCurrency(),
    current_cycle_start: subscription.current_cycle_start,
    current_cycle_end: subscription.current_cycle_end,
    customer: {
      id: subscription.businessCustomer.id,
      person_id: subscription.businessCustomer.person.id,
      name: subscription.businessCustomer.person.name,
      phone: subscription.businessCustomer.person.phone,
      email: subscription.businessCustomer.person.email,
    },
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      services: subscription.plan.services.map(({ service }) => service),
      combos: subscription.plan.combos.map(({ serviceCombo }) => serviceCombo),
    },
    cycle: cycle
      ? {
          id: cycle.id,
          start: cycle.cycle_start,
          end: cycle.cycle_end,
          credits_granted: cycle.credits_granted,
          credits_reserved: cycle.credits_reserved,
          credits_consumed: cycle.credits_consumed,
          credits_refunded: cycle.credits_refunded,
          available_credits: getAvailableCredits(cycle),
        }
      : null,
    // Assinatura NÃO renova sozinha: o cliente paga o profissional e cria a
    // nova série de agendamentos a cada ciclo (ver PLANO_ACAO, seção 14).
    ...summary,
    created_at: subscription.created_at,
  };
}
