import { PrismaService } from '@app/shared';
import { CustomerPlanSummaryService } from '@app/shared/services';
import { getAvailableCredits } from '@app/shared/utils';
import { CurrentUser } from '@app/shared/types/app-request';
import { Price } from '@app/shared/value-objects';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class GetCustomerPlansUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly summaryService: CustomerPlanSummaryService,
  ) {}

  async execute({
    user,
    businessSlug,
  }: {
    user: CurrentUser;
    businessSlug?: string;
  }) {
    if (!user?.personId) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    const subscriptions = await this.prisma.customerPlanSubscription.findMany({
      where: {
        personId: user.personId,
        status: 'ACTIVE',
        ...(businessSlug ? { business: { slug: businessSlug } } : {}),
      },
      include: clientSubscriptionInclude,
      orderBy: { current_cycle_end: 'asc' },
    });

    const summaries = await this.summaryService.summarize(
      subscriptions.map((subscription) => ({
        id: subscription.id,
        current_cycle_end: subscription.current_cycle_end,
        cycle: subscription.cycles[0] ?? null,
      })),
    );

    return subscriptions.map((subscription) => {
      const cycle = subscription.cycles[0] ?? null;

      return {
        id: subscription.id,
        status: subscription.status,
        business: subscription.business,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          description: subscription.plan.description,
          price: new Price(subscription.price_in_cents_snapshot).toCurrency(),
          services: subscription.plan.services.map(({ service }) => ({
            id: service.id,
            name: service.name,
          })),
          combos: subscription.plan.combos.map(({ serviceCombo }) => ({
            id: serviceCombo.id,
            name: serviceCombo.name,
          })),
        },
        rules: subscription.rules_snapshot,
        current_cycle_start: subscription.current_cycle_start,
        current_cycle_end: subscription.current_cycle_end,
        cycle: cycle
          ? {
              id: cycle.id,
              credits_granted: cycle.credits_granted,
              credits_reserved: cycle.credits_reserved,
              credits_consumed: cycle.credits_consumed,
              credits_refunded: cycle.credits_refunded,
              available_credits: getAvailableCredits(cycle),
            }
          : null,
        // Assinatura NÃO renova sozinha: ver `auto_renews`, `alert` e
        // `next_payment_estimate` no resumo.
        ...summaries.get(subscription.id),
      };
    });
  }
}

const clientSubscriptionInclude = {
  business: { select: { id: true, slug: true, name: true, logo: true } },
  plan: {
    select: {
      id: true,
      name: true,
      description: true,
      services: {
        select: { service: { select: { id: true, name: true } } },
      },
      combos: {
        select: { serviceCombo: { select: { id: true, name: true } } },
      },
    },
  },
  cycles: {
    orderBy: { cycle_start: 'desc' },
    take: 1,
    select: {
      id: true,
      credits_granted: true,
      credits_reserved: true,
      credits_consumed: true,
      credits_refunded: true,
    },
  },
} satisfies Prisma.CustomerPlanSubscriptionInclude;
