import {
  buildCustomerPlanSummary,
  getAvailableCredits,
} from './customer-plan-summary';

const d = (iso: string) => new Date(iso);

const cycle = (over: Partial<Record<string, number>> = {}) => ({
  credits_granted: 4,
  credits_reserved: 0,
  credits_consumed: 0,
  credits_refunded: 0,
  ...over,
});

const appt = (
  id: string,
  iso: string,
  status = 'CONFIRMED',
  redemption = 'RESERVED',
) => ({
  id,
  start_at_utc: d(iso),
  status,
  redemption_status: redemption,
});

describe('getAvailableCredits', () => {
  it('nao soma credits_refunded (devolver credito ja decrementa reserved)', () => {
    // 4 creditos, 1 reservado e devolvido: reserved volta a 0, refunded=1
    expect(getAvailableCredits(cycle({ credits_refunded: 1 }))).toBe(4);
  });

  it('desconta reservados e consumidos', () => {
    expect(
      getAvailableCredits(cycle({ credits_reserved: 1, credits_consumed: 2 })),
    ).toBe(1);
  });

  it('nunca retorna negativo', () => {
    expect(getAvailableCredits(cycle({ credits_reserved: 6 }))).toBe(0);
  });
});

describe('buildCustomerPlanSummary', () => {
  const now = d('2026-10-10T12:00:00Z');
  const end = d('2026-10-31T23:59:59.999Z');

  it('marca que a assinatura nao renova sozinha', () => {
    const s = buildCustomerPlanSummary({
      cycle: cycle(),
      currentCycleEnd: end,
      appointments: [],
      now,
    });
    expect(s.auto_renews).toBe(false);
  });

  it('estima o proximo pagamento logo apos o fim do ciclo', () => {
    const s = buildCustomerPlanSummary({
      cycle: cycle(),
      currentCycleEnd: end,
      appointments: [],
      now,
    });
    expect(s.next_payment_estimate.toISOString()).toBe(
      '2026-11-01T00:00:00.000Z',
    );
    expect(s.days_until_cycle_end).toBe(22);
  });

  it('numera os agendamentos do ciclo e destaca o proximo', () => {
    const s = buildCustomerPlanSummary({
      cycle: cycle({ credits_reserved: 2, credits_consumed: 1 }),
      currentCycleEnd: end,
      appointments: [
        appt('c', '2026-10-24T14:00:00Z'),
        appt('a', '2026-10-03T14:00:00Z', 'COMPLETED', 'CONSUMED'),
        appt('b', '2026-10-17T14:00:00Z'),
      ],
      now,
    });
    expect(s.appointments.map((x) => [x.id, x.sequence])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    expect(s.appointments.find((x) => x.is_next)?.id).toBe('b');
    expect(s.current_sequence).toBe(2);
    expect(s.credits_remaining).toBe(1);
    expect(s.alert).toBe('NONE');
  });

  it('ignora agendamentos cancelados e creditos devolvidos na lista', () => {
    const s = buildCustomerPlanSummary({
      cycle: cycle({ credits_reserved: 1, credits_refunded: 1 }),
      currentCycleEnd: end,
      appointments: [
        appt('x', '2026-10-15T14:00:00Z', 'CANCELED', 'REFUNDED'),
        appt('y', '2026-10-20T14:00:00Z'),
      ],
      now,
    });
    expect(s.appointments.map((x) => x.id)).toEqual(['y']);
    expect(s.credits_remaining).toBe(3);
  });

  it('alerta de ultimo agendamento quando so resta um reservado e nenhum livre', () => {
    const s = buildCustomerPlanSummary({
      cycle: cycle({ credits_reserved: 1, credits_consumed: 3 }),
      currentCycleEnd: end,
      appointments: [appt('last', '2026-10-20T14:00:00Z')],
      now,
    });
    expect(s.is_last_credit).toBe(true);
    expect(s.alert).toBe('LAST_APPOINTMENT');
  });

  it('nao e ultimo se ainda ha credito livre', () => {
    const s = buildCustomerPlanSummary({
      cycle: cycle({ credits_reserved: 1, credits_consumed: 2 }),
      currentCycleEnd: end,
      appointments: [appt('n', '2026-10-20T14:00:00Z')],
      now,
    });
    expect(s.is_last_credit).toBe(false);
  });

  it('alerta de creditos usados quando tudo foi consumido', () => {
    const s = buildCustomerPlanSummary({
      cycle: cycle({ credits_consumed: 4 }),
      currentCycleEnd: end,
      appointments: [],
      now,
    });
    expect(s.alert).toBe('CREDITS_USED_UP');
  });

  it('alerta de ciclo acabando a 3 dias ou menos', () => {
    const s = buildCustomerPlanSummary({
      cycle: cycle(),
      currentCycleEnd: end,
      appointments: [],
      now: d('2026-10-29T12:00:00Z'),
    });
    expect(s.days_until_cycle_end).toBe(3);
    expect(s.alert).toBe('CYCLE_ENDING');
  });

  it('alerta de ciclo encerrado depois do fim', () => {
    const s = buildCustomerPlanSummary({
      cycle: cycle({ credits_consumed: 2 }),
      currentCycleEnd: end,
      appointments: [],
      now: d('2026-11-02T12:00:00Z'),
    });
    expect(s.cycle_ended).toBe(true);
    expect(s.days_until_cycle_end).toBe(0);
    expect(s.alert).toBe('CYCLE_ENDED');
  });
});
