import { CustomerPlanCreditService } from './customer-plan-credit.service';

const future = (days: number) => new Date(Date.now() + days * 86_400_000);

function makeTx({
  cycle,
  last,
  settings = null,
}: {
  cycle: Record<string, number>;
  last: { appointmentId: string; start: Date } | null;
  settings?: Record<string, unknown> | null;
}) {
  return {
    $executeRaw: jest.fn().mockResolvedValue(1),
    appointmentPlanRedemption: {
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(
        last
          ? {
              appointmentId: last.appointmentId,
              appointment: { start_at_utc: last.start },
            }
          : null,
      ),
    },
    customerServicePlanCycle: {
      findUnique: jest.fn().mockResolvedValue({
        credits_refunded: 0,
        ...cycle,
        subscription: { businessId: 'biz', personId: 'person' },
      }),
    },
    businessReminderSettings: {
      findFirst: jest.fn().mockResolvedValue(settings),
    },
    reminderJob: {
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe('CustomerPlanCreditService.reservePreparedCredit (aviso de ultimo agendamento)', () => {
  const service = new CustomerPlanCreditService();
  const params = { appointmentId: 'apt-4', subscriptionId: 'sub', cycleId: 'cyc' };

  it('cria job PLAN_LAST_APPOINTMENT por canal quando a reserva esgota os creditos', async () => {
    const tx = makeTx({
      cycle: { credits_granted: 4, credits_reserved: 4, credits_consumed: 0 },
      last: { appointmentId: 'apt-4', start: future(10) },
    });

    await service.reservePreparedCredit({ tx, ...params });

    expect(tx.reminderJob.upsert).toHaveBeenCalledTimes(2); // PUSH + WHATSAPP
    const created = tx.reminderJob.upsert.mock.calls.map((c) => c[0].create);
    expect(created.map((c) => c.channel).sort()).toEqual(['PUSH', 'WHATSAPP']);
    expect(created[0]).toMatchObject({
      type: 'PLAN_LAST_APPOINTMENT',
      appointmentId: 'apt-4',
      customerPlanSubscriptionId: 'sub',
      cycleId: 'cyc',
      businessId: 'biz',
      personId: 'person',
    });
    // 1 dia antes do ultimo agendamento (offset padrao 1440 min)
    const due: Date = created[0].due_at_utc;
    expect(due.getTime()).toBeLessThan(future(10).getTime());
    expect(due.getTime()).toBeGreaterThan(future(8.9).getTime());
    // reaponta jobs ainda nao enviados, nunca os SENT
    expect(tx.reminderJob.updateMany.mock.calls[0][0].where.status).toEqual({
      not: 'SENT',
    });
  });

  it('aponta o job para o agendamento cronologicamente mais tardio, nao para o recem-criado', async () => {
    const tx = makeTx({
      cycle: { credits_granted: 2, credits_reserved: 2, credits_consumed: 0 },
      last: { appointmentId: 'apt-later', start: future(20) },
    });

    await service.reservePreparedCredit({ tx, ...params, appointmentId: 'apt-earlier' });

    expect(tx.reminderJob.upsert.mock.calls[0][0].create.appointmentId).toBe(
      'apt-later',
    );
  });

  it('nao cria aviso enquanto ainda ha credito livre', async () => {
    const tx = makeTx({
      cycle: { credits_granted: 4, credits_reserved: 2, credits_consumed: 0 },
      last: { appointmentId: 'apt-2', start: future(10) },
    });

    await service.reservePreparedCredit({ tx, ...params });

    expect(tx.reminderJob.upsert).not.toHaveBeenCalled();
  });

  it('respeita configuracao desativada do negocio', async () => {
    const tx = makeTx({
      cycle: { credits_granted: 1, credits_reserved: 1, credits_consumed: 0 },
      last: { appointmentId: 'apt-1', start: future(10) },
      settings: { is_active: false, channels: ['PUSH'], offsets_min_before: [60] },
    });

    await service.reservePreparedCredit({ tx, ...params });

    expect(tx.reminderJob.upsert).not.toHaveBeenCalled();
  });

  it('agenda em 1 minuto quando o ultimo agendamento ja esta dentro da janela do aviso', async () => {
    const tx = makeTx({
      cycle: { credits_granted: 1, credits_reserved: 1, credits_consumed: 0 },
      last: { appointmentId: 'apt-1', start: new Date(Date.now() + 3 * 3_600_000) },
    });

    await service.reservePreparedCredit({ tx, ...params });

    const due: Date = tx.reminderJob.upsert.mock.calls[0][0].create.due_at_utc;
    expect(due.getTime() - Date.now()).toBeLessThan(2 * 60_000);
  });

  it('nao devolve credito em dobro: disponivel considera so reservados e consumidos', () => {
    expect(
      service.availableCredits({
        credits_granted: 4,
        credits_reserved: 0,
        credits_consumed: 0,
        credits_refunded: 1,
      }),
    ).toBe(4);
  });
});
