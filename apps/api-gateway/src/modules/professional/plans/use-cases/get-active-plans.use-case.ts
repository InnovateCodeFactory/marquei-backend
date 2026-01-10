import { PrismaService } from '@app/shared';
import { Price } from '@app/shared/value-objects';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetActivePlansUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute() {
    const plans = await this.prismaService.plan.findMany({
      where: { is_active: true },
      orderBy: [{ billing_period: 'asc' }, { showing_order: 'asc' }],
    });

    const grouped = new Map<
      string,
      { plan: string; options: any[]; benefits?: any[] }
    >();

    for (const p of plans) {
      const periodLabel = this.getPlanBillingPeriod(p.billing_period);

      if (!grouped.has(periodLabel)) {
        grouped.set(periodLabel, { plan: periodLabel, options: [] });
      }

      const group = grouped.get(periodLabel)!;

      group.options.push({
        label: p.name,
        value: new Price(p.price_in_cents).toCurrency(),
        oldValue: null,
        stripe_price_id: p.plan_id,
        plan_id_play_store: p.plan_id_play_store,
        destactLabel: null,
        max_professionals_allowed: p.max_professionals_allowed,
        price_in_cents: p.price_in_cents,
      });
    }

    return Array.from(grouped.values());
  }

  private getPlanBillingPeriod(billingPeriod: string): string {
    const billingPeriods = {
      MONTHLY: 'Mensal',
      YEARLY: 'Anual',
    };

    return billingPeriods[billingPeriod] || 'Desconhecido';
  }
}
