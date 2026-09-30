import { WaitlistHoldService } from './waitlist-hold.service';

describe('WaitlistHoldService', () => {
  const start = new Date('2031-03-03T12:00:00Z');
  const end = new Date('2031-03-03T13:00:00Z');

  function build(found: unknown = null) {
    const db: any = {
      waitlistOffer: {
        findFirst: jest.fn().mockResolvedValue(found),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    return { service: new WaitlistHoldService(db), db };
  }

  it('so considera oferta PENDING, nao expirada e que sobrepoe o intervalo do profissional', async () => {
    const { service, db } = build({ id: 'o1' });
    const now = new Date('2031-03-03T10:00:00Z');

    const hold = await service.findBlockingHold(
      { professionalProfileId: 'pro1', startUtc: start, endUtc: end, now },
    );

    expect(hold).toEqual({ id: 'o1' });
    expect(db.waitlistOffer.findFirst.mock.calls[0][0].where).toEqual({
      professionalProfileId: 'pro1',
      status: 'PENDING',
      expires_at_utc: { gt: now },
      slot_start_at_utc: { lt: end },
      slot_end_at_utc: { gt: start },
    });
  });

  it('ignora a propria oferta que esta sendo aceita', async () => {
    const { service, db } = build();
    await service.findBlockingHold({
      professionalProfileId: 'pro1',
      startUtc: start,
      endUtc: end,
      ignoreOfferId: 'mine',
    });
    expect(db.waitlistOffer.findFirst.mock.calls[0][0].where.id).toEqual({ not: 'mine' });
  });

  it('usa o cliente de transacao quando informado', async () => {
    const { service } = build();
    const tx: any = { waitlistOffer: { findFirst: jest.fn().mockResolvedValue(null) } };
    await service.findBlockingHold({ professionalProfileId: 'p', startUtc: start, endUtc: end }, tx);
    expect(tx.waitlistOffer.findFirst).toHaveBeenCalled();
  });
});
