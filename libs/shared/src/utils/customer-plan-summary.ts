export type PlanCycleCounters = {
  credits_granted: number;
  credits_reserved: number;
  credits_consumed: number;
  credits_refunded: number;
};

export type PlanCycleAppointmentInput = {
  id: string;
  start_at_utc: Date;
  status: string;
  redemption_status: string;
  service_name?: string | null;
  professional_name?: string | null;
};

export type CustomerPlanAlert =
  | 'NONE'
  | 'CYCLE_ENDING'
  | 'LAST_APPOINTMENT'
  | 'CREDITS_USED_UP'
  | 'CYCLE_ENDED';

export const PLAN_CYCLE_ENDING_ALERT_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_STATUSES = ['PENDING', 'CONFIRMED'];

/**
 * Créditos livres do ciclo. `credits_refunded` é só contador de auditoria:
 * ao devolver um crédito o `credits_reserved` já é decrementado, então somar
 * `refunded` aqui devolveria o crédito duas vezes.
 */
export function getAvailableCredits(
  cycle: Pick<
    PlanCycleCounters,
    'credits_granted' | 'credits_reserved' | 'credits_consumed'
  >,
) {
  return Math.max(
    0,
    cycle.credits_granted - cycle.credits_reserved - cycle.credits_consumed,
  );
}

export function buildCustomerPlanSummary({
  cycle,
  currentCycleEnd,
  appointments,
  now = new Date(),
}: {
  cycle: PlanCycleCounters | null;
  currentCycleEnd: Date;
  appointments: PlanCycleAppointmentInput[];
  now?: Date;
}) {
  const creditsGranted = cycle?.credits_granted ?? 0;
  const creditsUsed = cycle?.credits_consumed ?? 0;
  const creditsScheduled = cycle?.credits_reserved ?? 0;
  const creditsRemaining = cycle ? getAvailableCredits(cycle) : 0;

  const cycleEnded = now.getTime() > currentCycleEnd.getTime();
  const daysUntilCycleEnd = cycleEnded
    ? 0
    : Math.ceil((currentCycleEnd.getTime() - now.getTime()) / DAY_MS);

  const listed = appointments
    .filter(
      (item) =>
        item.redemption_status !== 'REFUNDED' && item.status !== 'CANCELED',
    )
    .sort((a, b) => a.start_at_utc.getTime() - b.start_at_utc.getTime());

  const nextAppointment = listed.find(
    (item) =>
      item.start_at_utc.getTime() >= now.getTime() &&
      UPCOMING_STATUSES.includes(item.status),
  );

  const isLastCredit =
    !cycleEnded && creditsRemaining === 0 && creditsScheduled === 1;

  let alert: CustomerPlanAlert = 'NONE';
  if (cycleEnded) alert = 'CYCLE_ENDED';
  else if (isLastCredit) alert = 'LAST_APPOINTMENT';
  else if (
    creditsRemaining === 0 &&
    creditsScheduled === 0 &&
    creditsGranted > 0
  )
    alert = 'CREDITS_USED_UP';
  else if (daysUntilCycleEnd <= PLAN_CYCLE_ENDING_ALERT_DAYS)
    alert = 'CYCLE_ENDING';

  return {
    auto_renews: false as const,
    alert,
    cycle_ended: cycleEnded,
    days_until_cycle_end: daysUntilCycleEnd,
    // Estimativa: o novo ciclo começa logo depois do fim do atual.
    next_payment_estimate: new Date(currentCycleEnd.getTime() + 1),
    credits_granted: creditsGranted,
    credits_used: creditsUsed,
    credits_scheduled: creditsScheduled,
    credits_remaining: creditsRemaining,
    is_last_credit: isLastCredit,
    current_sequence: nextAppointment
      ? listed.findIndex((item) => item.id === nextAppointment.id) + 1
      : null,
    appointments: listed.map((item, index) => ({
      id: item.id,
      sequence: index + 1,
      total: creditsGranted,
      start_at: item.start_at_utc,
      status: item.status,
      redemption_status: item.redemption_status,
      service_name: item.service_name ?? null,
      professional_name: item.professional_name ?? null,
      is_next: item.id === nextAppointment?.id,
    })),
  };
}

export type CustomerPlanSummary = ReturnType<typeof buildCustomerPlanSummary>;
