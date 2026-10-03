import { SchedulePlanReminderUseCase } from './schedule-plan-reminder.use-case';

const inMs = (ms: number) => new Date(Date.now() + ms);
const HOUR = 3_600_000;

function job(over: Record<string, unknown> = {}) {
  return {
    id: 'j-push',
    type: 'PLAN_CYCLE_ENDING',
    channel: 'PUSH',
    due_at_utc: new Date(Date.now() - 1000),
    businessId: 'b1',
    customerPlanSubscriptionId: 'sub1',
    cycleId: 'cyc1',
    appointmentId: null,
    appointment: null,
    customerPlanSubscription: {
      status: 'ACTIVE',
      current_cycle_end: inMs(48 * HOUR),
      business: { name: 'Studio' },
      plan: { name: 'Plano Mensal' },
      cycles: [
        {
          id: 'cyc1',
          credits_granted: 4,
          credits_reserved: 1,
          credits_consumed: 2,
          credits_refunded: 0,
        },
      ],
    },
    person: {
      phone: '5511999990000',
      user: { push_token: 'ExponentPushToken[x]' },
    },
    ...over,
  };
}

function build({
  jobs = [job()] as any[],
  subscriptions = [] as any[],
  lastRedemption = null as any,
  settings = null as any,
} = {}) {
  const prisma: any = {
    customerPlanSubscription: {
      findMany: jest.fn().mockResolvedValue(subscriptions),
    },
    businessReminderSettings: {
      findMany: jest.fn().mockResolvedValue(settings ? [settings] : []),
      findFirst: jest.fn().mockResolvedValue(settings),
    },
    reminderJob: {
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue(jobs),
      update: jest.fn().mockResolvedValue({}),
    },
    appointmentPlanRedemption: {
      findFirst: jest.fn().mockResolvedValue(lastRedemption),
    },
  };
  const rmq = { publishToQueue: jest.fn().mockResolvedValue(undefined) };
  const lock = {
    tryAcquire: jest.fn().mockResolvedValue({
      renew: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(true),
    }),
  };
  return {
    useCase: new SchedulePlanReminderUseCase(prisma, rmq as any, lock as any),
    prisma,
    rmq,
  };
}

const statusUpdates = (prisma: any) =>
  prisma.reminderJob.update.mock.calls.map((c: any) => c[0].data.status);

describe('SchedulePlanReminderUseCase: PLAN_CYCLE_ENDING', () => {
  it('gera aviso por canal quando entra na janela de 3 dias antes do fim do ciclo', async () => {
    const { useCase, prisma } = build({
      jobs: [],
      subscriptions: [
        {
          id: 'sub1',
          businessId: 'b1',
          personId: 'p1',
          current_cycle_end: inMs(2 * 24 * HOUR),
          cycles: [{ id: 'cyc1' }],
        },
      ],
    });

    await useCase.execute();

    const channels = prisma.reminderJob.upsert.mock.calls.map(
      (c: any) => c[0].create.channel,
    );
    expect(channels.sort()).toEqual(['PUSH', 'WHATSAPP']);
    expect(prisma.reminderJob.upsert.mock.calls[0][0].create).toMatchObject({
      type: 'PLAN_CYCLE_ENDING',
      cycleId: 'cyc1',
      customerPlanSubscriptionId: 'sub1',
    });
    // idempotencia: update vazio no upsert (nao reenvia no mesmo ciclo)
    expect(prisma.reminderJob.upsert.mock.calls[0][0].update).toEqual({});
  });

  it('ainda nao gera quando falta mais que a antecedencia configurada', async () => {
    const { useCase, prisma } = build({
      jobs: [],
      subscriptions: [
        {
          id: 'sub1',
          businessId: 'b1',
          personId: 'p1',
          current_cycle_end: inMs(6 * 24 * HOUR),
          cycles: [{ id: 'cyc1' }],
        },
      ],
    });
    await useCase.execute();
    expect(prisma.reminderJob.upsert).not.toHaveBeenCalled();
  });

  it('respeita negocio que desativou o aviso', async () => {
    const { useCase, prisma } = build({
      jobs: [],
      settings: {
        businessId: 'b1',
        is_active: false,
        channels: ['PUSH'],
        offsets_min_before: [4320],
      },
      subscriptions: [
        {
          id: 'sub1',
          businessId: 'b1',
          personId: 'p1',
          current_cycle_end: inMs(24 * HOUR),
          cycles: [{ id: 'cyc1' }],
        },
      ],
    });
    await useCase.execute();
    expect(prisma.reminderJob.upsert).not.toHaveBeenCalled();
  });

  it('envia push com texto que deixa claro que o plano nao renova sozinho e agenda o WhatsApp depois', async () => {
    const { useCase, prisma, rmq } = build({
      jobs: [job(), job({ id: 'j-wa', channel: 'WHATSAPP' })],
    });

    await useCase.execute();

    expect(rmq.publishToQueue).toHaveBeenCalledTimes(1); // so o push agora
    const payload = rmq.publishToQueue.mock.calls[0][0].payload;
    expect(payload.body).toMatch(/não renova sozinho/);
    expect(payload.body).toMatch(/1 agendamento sem usar/);
    expect(statusUpdates(prisma)).toEqual(['SENT', 'SCHEDULED']);
  });

  it('pula se o ciclo mudou (assinatura renovada)', async () => {
    const other = job();
    other.customerPlanSubscription.cycles[0].id = 'cyc2';
    const { useCase, prisma, rmq } = build({ jobs: [other] });
    await useCase.execute();
    expect(rmq.publishToQueue).not.toHaveBeenCalled();
    expect(prisma.reminderJob.update.mock.calls[0][0].data).toMatchObject({
      status: 'SKIPPED',
      error: 'cycle_changed',
    });
  });

  it('pula assinatura pausada/cancelada e sem token/telefone', async () => {
    const paused = job();
    paused.customerPlanSubscription.status = 'PAUSED';
    const a = build({ jobs: [paused] });
    await a.useCase.execute();
    expect(a.prisma.reminderJob.update.mock.calls[0][0].data.error).toBe(
      'subscription_inactive',
    );

    const noToken = job({
      person: { phone: null, user: { push_token: null } },
    });
    const b = build({ jobs: [noToken] });
    await b.useCase.execute();
    expect(b.rmq.publishToQueue).not.toHaveBeenCalled();
    expect(b.prisma.reminderJob.update.mock.calls[0][0].data.error).toBe(
      'missing_push_token',
    );
  });
});

describe('SchedulePlanReminderUseCase: PLAN_LAST_APPOINTMENT', () => {
  const lastJob = (
    appointmentOver: Record<string, unknown> = {},
    subOver: Record<string, unknown> = {},
  ) => {
    const j = job({
      type: 'PLAN_LAST_APPOINTMENT',
      appointmentId: 'apt4',
      appointment: {
        id: 'apt4',
        start_at_utc: inMs(20 * HOUR),
        status: 'CONFIRMED',
        timezone: 'America/Sao_Paulo',
        ...appointmentOver,
      },
    });
    Object.assign(j.customerPlanSubscription.cycles[0], {
      credits_granted: 4,
      credits_reserved: 1,
      credits_consumed: 3,
      credits_refunded: 0,
      ...subOver,
    });
    return j;
  };

  it('envia o aviso de ultimo agendamento quando ele e realmente o ultimo', async () => {
    const { useCase, rmq } = build({
      jobs: [lastJob()],
      lastRedemption: { appointmentId: 'apt4' },
    });
    await useCase.execute();
    const body = rmq.publishToQueue.mock.calls[0][0].payload.body;
    expect(body).toMatch(/último do plano Plano Mensal/);
    expect(body).toMatch(/não renova sozinho/);
  });

  it('pula se ainda ha credito livre (cliente cancelou outro / renovou)', async () => {
    const { useCase, prisma, rmq } = build({
      jobs: [lastJob({}, { credits_reserved: 0, credits_consumed: 3 })],
      lastRedemption: { appointmentId: 'apt4' },
    });
    await useCase.execute();
    expect(rmq.publishToQueue).not.toHaveBeenCalled();
    expect(prisma.reminderJob.update.mock.calls[0][0].data.error).toBe(
      'no_longer_last',
    );
  });

  it('pula se existe agendamento mais tardio no ciclo', async () => {
    const { useCase, prisma } = build({
      jobs: [lastJob()],
      lastRedemption: { appointmentId: 'other-later' },
    });
    await useCase.execute();
    expect(prisma.reminderJob.update.mock.calls[0][0].data.error).toBe(
      'no_longer_last',
    );
  });

  it('pula agendamento cancelado', async () => {
    const { useCase, prisma } = build({
      jobs: [lastJob({ status: 'CANCELED' })],
      lastRedemption: { appointmentId: 'apt4' },
    });
    await useCase.execute();
    expect(prisma.reminderJob.update.mock.calls[0][0].data.error).toBe(
      'appointment_status_invalid',
    );
  });

  it('remarcado para bem mais longe: reagenda o aviso em vez de enviar cedo demais', async () => {
    const { useCase, prisma, rmq } = build({
      jobs: [lastJob({ start_at_utc: inMs(10 * 24 * HOUR) })],
      lastRedemption: { appointmentId: 'apt4' },
    });
    await useCase.execute();
    expect(rmq.publishToQueue).not.toHaveBeenCalled();
    const data = prisma.reminderJob.update.mock.calls[0][0].data;
    expect(data.status).toBe('PENDING');
    expect(data.due_at_utc.getTime()).toBeGreaterThan(
      Date.now() + 8 * 24 * HOUR,
    );
  });
});
