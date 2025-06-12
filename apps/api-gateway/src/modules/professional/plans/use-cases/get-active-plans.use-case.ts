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

    return plans?.map((plan) => ({
      name: plan.name,
      price: new Price(plan.price_in_cents).toCurrency(),
      billing_period: plan.billing_period,
      billing_period_formatted: this.getPlanBillingPeriod(plan.billing_period),
      stripe_price_id: plan.stripePriceId,
    }));
  }

  private getPlanBillingPeriod(billingPeriod: string): string {
    const billingPeriods = {
      MONTHLY: 'Mensal',
      YEARLY: 'Anual',
    };

    return billingPeriods[billingPeriod] || 'Desconhecido';
  }
}
