import { ExpireWaitlistOffersUseCase } from './expire-waitlist-offers.use-case';

const future = (m: number) => new Date(Date.now() + m * 60_000);

function build({ due = [] as any[], claim = 1, stale = [] as any[] } = {}) {
  const tx = {
    waitlistOffer: { updateMany: jest.fn().mockResolvedValue({ count: claim }) },
    waitlistEvent: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma: any = {
    waitlistOffer: {
      findMany: jest.fn().mockResolvedValue(due),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    waitlistEntry: {
      findMany: jest.fn().mockResolvedValue(stale),
      updateMany: jest.fn().mockResolvedValue({ count: stale.length }),
    },
    waitlistEvent: { createMany: jest.fn().mockResolvedValue({ count: stale.length }) },
    $transaction: jest.fn(async (arg: any) =>
      typeof arg === 'function' ? arg(tx) : Promise.all(arg),
    ),
  };
  const events = { publishSlotFreed: jest.fn().mockResolvedValue(undefined) };
  const useCase = new ExpireWaitlistOffersUseCase(prisma, {} as any, events as any);
  return { useCase, prisma, tx, events };
}

const offer = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  waitlistEntryId: 'e1',
  businessId: 'b1',
  professionalProfileId: 'pro1',
  slot_start_at_utc: future(60),
  slot_end_at_utc: future(90),
  ...over,
});

describe('ExpireWaitlistOffersUseCase.expireOffers', () => {
  it('expira a oferta, registra OFFER_EXPIRED e passa a vaga para o proximo', async () => {
    const { useCase, tx, events } = build({ due: [offer()] });

    expect(await useCase.expireOffers()).toBe(1);

    expect(tx.waitlistOffer.updateMany.mock.calls[0][0].data.status).toBe('EXPIRED');
    expect(tx.waitlistEvent.create.mock.calls[0][0].data.event_type).toBe('OFFER_EXPIRED');
    expect(events.publishSlotFreed).toHaveBeenCalledWith(
      expect.objectContaining({ professionalProfileId: 'pro1', reason: 'OFFER_EXPIRED' }),
    );
  });

  it('nao mexe na entrada: quem perdeu o prazo continua WAITING', async () => {
    const { useCase, prisma } = build({ due: [offer()] });
    await useCase.expireOffers();
    expect(prisma.waitlistEntry.updateMany).not.toHaveBeenCalled();
  });

  it('se o aceite concorrente ganhou o claim, nao publica nem cria evento', async () => {
    const { useCase, tx, events } = build({ due: [offer()], claim: 0 });
    expect(await useCase.expireOffers()).toBe(0);
    expect(tx.waitlistEvent.create).not.toHaveBeenCalled();
    expect(events.publishSlotFreed).not.toHaveBeenCalled();
  });

  it('nao republica vaga que ja comecou', async () => {
    const { useCase, events } = build({ due: [offer({ slot_start_at_utc: future(-5) })] });
    await useCase.expireOffers();
    expect(events.publishSlotFreed).not.toHaveBeenCalled();
  });
});

describe('ExpireWaitlistOffersUseCase.expireEntriesOfPastDays', () => {
  it('marca EXPIRED_DAY_PASSED e registra REMOVED_DAY_PASSED', async () => {
    const { useCase, prisma } = build({ stale: [{ id: 'e1' }, { id: 'e2' }] });

    expect(await useCase.expireEntriesOfPastDays()).toBe(2);

    expect(prisma.waitlistEntry.updateMany.mock.calls[0][0].data.status).toBe('EXPIRED_DAY_PASSED');
    expect(prisma.waitlistEvent.createMany.mock.calls[0][0].data).toEqual([
      { waitlistEntryId: 'e1', event_type: 'REMOVED_DAY_PASSED' },
      { waitlistEntryId: 'e2', event_type: 'REMOVED_DAY_PASSED' },
    ]);
  });

  it('sem entradas vencidas nao grava nada', async () => {
    const { useCase, prisma } = build();
    expect(await useCase.expireEntriesOfPastDays()).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
