import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Price } from '@app/shared/value-objects';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class GetActivePlansUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(user: CurrentUser) {
    if (!user?.current_selected_business_slug)
      throw new UnauthorizedException(
        'Você não possui uma empresa selecionada',
      );

    const plans = await this.prismaService.plan.findMany({
      where: {
        is_active: true,
      },
      select: {
        name: true,
        price_in_cents: true,
        billing_period: true,
        stripePriceId: true,
      },
    });

    const grouped = plans.reduce(
      (acc, plan) => {
        const key = plan.name;
        if (!acc[key]) {
          acc[key] = {
            plan: plan.name,
            options: [],
          };
        }

        acc[key].options.push({
          value:
            new Price(
              plan.billing_period === 'YEARLY'
                ? plan.price_in_cents / 12
                : plan.price_in_cents,
            ).toCurrency() + (plan.billing_period === 'YEARLY' ? '/Mês' : ''),
          label: this.getPlanBillingPeriod(plan.billing_period),
          oldValue: new Price(plan.price_in_cents + 1000).toCurrency(), // ajuste se tiver valor anterior
          stripe_price_id: plan.stripePriceId,
          destactLabel:
            plan.billing_period === 'YEARLY' ? 'Recomendado' : undefined,
        });

        return acc;
      },
      {} as Record<string, { plan: string; options: any[] }>,
    );

    return Object.values(grouped);
  }

  private getPlanBillingPeriod(billingPeriod: string): string {
    const billingPeriods = {
      MONTHLY: 'Mensal',
      YEARLY: 'Anual',
    };

    return billingPeriods[billingPeriod] || 'Desconhecido';
  }
}
