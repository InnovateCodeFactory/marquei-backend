import { Nack } from '@golevelup/nestjs-rabbitmq';
import { OfferNextWaitlistEntryUseCase } from './offer-next-waitlist-entry.use-case';

const minutes = (n: number) => new Date(Date.now() + n * 60_000);

function entry(over: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    personId: 'p1',
    serviceId: 's1',
    serviceComboId: null,
    service: { name: 'Corte', duration: 30 },
    serviceCombo: null,
    person: { phone: '5511999990000', user: { push_token: 'ExponentPushToken[x]' } },
    ...over,
  };
}

function build({
  business = {
    name: 'Studio',
    is_active: true,
    is_waitlist_enabled: true,
    waitlist_offer_ttl_minutes: 10,
  } as any,
  candidates = [entry()] as any[],
  busy = false,
  hold = null as any,
  executes = 1,
  redisDone = false,
  locked = false,
} = {}) {
  const tx = {
    waitlistOffer: { create: jest.fn().mockResolvedValue({ id: 'offer-1' }) },
    waitlistEvent: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma: any = {
    business: { findUnique: jest.fn().mockResolvedValue(business) },
    appointment: { findFirst: jest.fn().mockResolvedValue(busy ? { id: 'a' } : null) },
    professionalTimesBlock: { findFirst: jest.fn().mockResolvedValue(null) },
    waitlistEntry: { findMany: jest.fn().mockResolvedValue(candidates) },
    professionalService: { count: jest.fn().mockResolvedValue(executes) },
    professionalServiceCombo: { count: jest.fn().mockResolvedValue(executes) },
    waitlistOffer: { update: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const rmq = { publishToQueue: jest.fn().mockResolvedValue(undefined) };
  const lock = {
    withLock: jest.fn(async (_opts: any, fn: any) => (locked ? null : fn({}))),
  };
  const redisStore = new Map<string, string>();
  if (redisDone) redisStore.set('waitlist:slot-freed:done:m1', '1');
  const redis = {
    exists: jest.fn(async ({ key }: any) => redisStore.has(key)),
    get: jest.fn(async ({ key }: any) => redisStore.get(key) ?? null),
    set: jest.fn(async ({ key, value }: any) => void redisStore.set(key, value)),
    del: jest.fn(async ({ key }: any) => void redisStore.delete(key)),
  };
  const holds = { findBlockingHold: jest.fn().mockResolvedValue(hold) };
  const useCase = new OfferNextWaitlistEntryUseCase(
    prisma,
    rmq as any,
    lock as any,
    redis as any,
    holds as any,
  );
  return { useCase, prisma, tx, rmq, lock, redis, holds, redisStore };
}

const slot = (startInMin = 120, lenMin = 30) => ({
  businessId: 'b1',
  professionalProfileId: 'pro1',
  slotStartUtc: minutes(startInMin),
  slotEndUtc: minutes(startInMin + lenMin),
});

describe('OfferNextWaitlistEntryUseCase.offerNext', () => {
  it('oferta a vaga ao primeiro da fila, cria evento e notifica push + WhatsApp', async () => {
    const { useCase, tx, rmq, prisma } = build();

    const res = await useCase.offerNext(slot());

    expect(res).toEqual({ outcome: 'OFFERED', offerId: 'offer-1' });
    expect(tx.waitlistOffer.create.mock.calls[0][0].data).toMatchObject({
      waitlistEntryId: 'e1',
      professionalProfileId: 'pro1',
      serviceId: 's1',
    });
    expect(tx.waitlistEvent.create.mock.calls[0][0].data.event_type).toBe('OFFER_SENT');
    expect(rmq.publishToQueue).toHaveBeenCalledTimes(2);
    const push = rmq.publishToQueue.mock.calls.find((c) => c[0].payload.pushTokens)![0].payload;
    expect(push.data).toEqual({ type: 'WAITLIST_SLOT_OFFERED', offer_id: 'offer-1' });
    expect(prisma.waitlistOffer.update).toHaveBeenCalled(); // notified_at_utc
  });

  it('busca a fila em ordem de entrada e exclui quem cancelou, quem tem oferta ativa e quem ja teve esta vaga', async () => {
    const { useCase, prisma } = build();

    await useCase.offerNext({ ...slot(), excludedPersonId: 'canceller' });

    const args = prisma.waitlistEntry.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual([{ queued_at: 'asc' }, { id: 'asc' }]);
    expect(args.where.status).toBe('WAITING');
    expect(args.where.personId).toEqual({ not: 'canceller' });
    expect(args.where.NOT).toHaveLength(2);
    expect(args.where.OR).toEqual([
      { professionalProfileId: 'pro1' },
      { professionalProfileId: null },
    ]);
  });

  it('pula quem o servico nao cabe na vaga e oferta ao proximo', async () => {
    const { useCase, tx } = build({
      candidates: [
        entry({ id: 'long', service: { name: 'Coloracao', duration: 90 } }),
        entry({ id: 'short' }),
      ],
    });

    const res = await useCase.offerNext(slot(120, 30));

    expect(res.outcome).toBe('OFFERED');
    expect(tx.waitlistOffer.create.mock.calls[0][0].data.waitlistEntryId).toBe('short');
  });

  it('pula fila "qualquer profissional" quando o profissional da vaga nao executa o servico', async () => {
    const { useCase } = build({ executes: 0 });
    expect((await useCase.offerNext(slot())).outcome).toBe('NO_ELIGIBLE');
  });

  it('sem elegiveis nao faz nada', async () => {
    const { useCase, rmq } = build({ candidates: [] });
    expect((await useCase.offerNext(slot())).outcome).toBe('NO_ELIGIBLE');
    expect(rmq.publishToQueue).not.toHaveBeenCalled();
  });

  it('nao oferta se a vaga ja foi ocupada por agendamento normal', async () => {
    const { useCase, prisma } = build({ busy: true });
    expect((await useCase.offerNext(slot())).outcome).toBe('SLOT_TAKEN');
    expect(prisma.waitlistEntry.findMany).not.toHaveBeenCalled();
  });

  it('nao oferta se ja existe outra oferta segurando o horario', async () => {
    const { useCase } = build({ hold: { id: 'other-offer' } });
    expect((await useCase.offerNext(slot())).outcome).toBe('SLOT_TAKEN');
  });

  it('nao oferta vaga que comeca em menos de 2 minutos', async () => {
    const { useCase } = build();
    expect((await useCase.offerNext(slot(1, 30))).outcome).toBe('TOO_LATE');
  });

  it('respeita negocio com lista de espera desligada', async () => {
    const { useCase } = build({
      business: { name: 'S', is_active: true, is_waitlist_enabled: false, waitlist_offer_ttl_minutes: 10 },
    });
    expect((await useCase.offerNext(slot())).outcome).toBe('WAITLIST_DISABLED');
  });

  it('usa o prazo configurado do negocio e nunca passa do inicio da vaga', async () => {
    const { useCase, tx } = build({
      business: { name: 'S', is_active: true, is_waitlist_enabled: true, waitlist_offer_ttl_minutes: 30 },
    });

    await useCase.offerNext(slot(10, 30)); // vaga em 10 min, prazo de 30 min

    const expires: Date = tx.waitlistOffer.create.mock.calls[0][0].data.expires_at_utc;
    const slotStart = slot(10, 30).slotStartUtc.getTime();
    expect(expires.getTime()).toBeLessThan(slotStart);
    expect(expires.getTime() - Date.now()).toBeGreaterThan(7 * 60_000);
  });

  it('toma lock por negocio + profissional + dia (reusa RedisLockService)', async () => {
    const { useCase, lock } = build();
    await useCase.offerNext(slot());
    expect(lock.withLock.mock.calls[0][0].key).toMatch(/^lock:waitlist:b1:pro1:\d{4}-\d{2}-\d{2}$/);
  });

  it('duas vagas concorrentes: a segunda enxerga a oferta pendente da primeira e escolhe outra pessoa', async () => {
    // A exclusao de quem ja tem oferta ativa e feita na query (NOT offers some PENDING)
    const { useCase, prisma } = build();
    await useCase.offerNext(slot());
    const notClause = prisma.waitlistEntry.findMany.mock.calls[0][0].where.NOT[0];
    expect(notClause.offers.some.status).toBe('PENDING');
    expect(notClause.offers.some.expires_at_utc.gt).toBeInstanceOf(Date);
  });
});

describe('OfferNextWaitlistEntryUseCase.handleSlotFreed (contrato de fila)', () => {
  const message = (over: Record<string, unknown> = {}) => ({
    message_id: 'm1',
    business_id: 'b1',
    professional_profile_id: 'pro1',
    slot_start_at_utc: minutes(120).toISOString(),
    slot_end_at_utc: minutes(150).toISOString(),
    reason: 'APPOINTMENT_CANCELED' as const,
    ...over,
  });

  it('payload invalido vai direto para a DLQ (non_retryable)', async () => {
    const { useCase } = build();
    const res = await useCase.handleSlotFreed(message({ business_id: '' }) as any);
    expect(res).toBeInstanceOf(Nack);
    expect((res as Nack)['requeue']).toBe(false);
  });

  it('e idempotente por message_id', async () => {
    const { useCase, prisma } = build({ redisDone: true });
    await useCase.handleSlotFreed(message() as any);
    expect(prisma.business.findUnique).not.toHaveBeenCalled();
  });

  it('marca como processada apos sucesso', async () => {
    const { useCase, redisStore } = build();
    await useCase.handleSlotFreed(message() as any);
    expect(redisStore.get('waitlist:slot-freed:done:m1')).toBe('1');
  });

  it('lock ocupado faz requeue e apos o teto de tentativas vai para a DLQ', async () => {
    const { useCase } = build({ locked: true });
    const results: Nack[] = [];
    for (let i = 0; i < 5; i++) {
      results.push((await useCase.handleSlotFreed(message() as any)) as Nack);
    }
    expect(results.slice(0, 4).every((r) => r['requeue'] === true)).toBe(true);
    expect(results[4]['requeue']).toBe(false);
  });

  it('falha tecnica inesperada tambem tem teto de tentativas', async () => {
    const { useCase, prisma } = build();
    prisma.business.findUnique.mockRejectedValue(new Error('db down'));
    const res = (await useCase.handleSlotFreed(message() as any)) as Nack;
    expect(res).toBeInstanceOf(Nack);
    expect(res['requeue']).toBe(true);
  });
});
