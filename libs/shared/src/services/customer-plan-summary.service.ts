import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/database/database.service';
import {
  buildCustomerPlanSummary,
  PlanCycleCounters,
} from '../utils/customer-plan-summary';

type SubscriptionForSummary = {
  id: string;
  current_cycle_end: Date;
  cycle: (PlanCycleCounters & { id: string }) | null;
};

@Injectable()
export class CustomerPlanSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Monta o resumo (posição na assinatura, créditos, próximo pagamento
   * estimado, alertas) de várias assinaturas com uma única query de agendamentos.
   */
  async summarize(subscriptions: SubscriptionForSummary[], now = new Date()) {
    const cycleIds = subscriptions
      .map((subscription) => subscription.cycle?.id)
      .filter((id): id is string => Boolean(id));

    const redemptions = cycleIds.length
      ? await this.prisma.appointmentPlanRedemption.findMany({
          where: { cycleId: { in: cycleIds } },
          select: {
            cycleId: true,
            status: true,
            appointment: {
              select: {
                id: true,
                start_at_utc: true,
                status: true,
                service: { select: { name: true } },
                professional: { select: { User: { select: { name: true } } } },
              },
            },
          },
        })
      : [];

    const byCycle = new Map<string, typeof redemptions>();
    for (const redemption of redemptions) {
      const list = byCycle.get(redemption.cycleId) ?? [];
      list.push(redemption);
      byCycle.set(redemption.cycleId, list);
    }

    return new Map(
      subscriptions.map((subscription) => {
        const items = subscription.cycle
          ? (byCycle.get(subscription.cycle.id) ?? [])
          : [];

        return [
          subscription.id,
          buildCustomerPlanSummary({
            cycle: subscription.cycle,
            currentCycleEnd: subscription.current_cycle_end,
            now,
            appointments: items.map((item) => ({
              id: item.appointment.id,
              start_at_utc: item.appointment.start_at_utc,
              status: item.appointment.status,
              redemption_status: item.status,
              service_name: item.appointment.service?.name ?? null,
              professional_name:
                item.appointment.professional?.User?.name ?? null,
            })),
          }),
        ] as const;
      }),
    );
  }
}
