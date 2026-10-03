import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AcceptWaitlistOfferUseCase } from './accept-waitlist-offer.use-case';
import { DeclineWaitlistOfferUseCase } from './decline-waitlist-offer.use-case';
import { JoinWaitlistUseCase } from './join-waitlist.use-case';
import { LeaveWaitlistUseCase } from './leave-waitlist.use-case';
import { computeWaitlistPosition } from './waitlist-presenter';

const req: any = { user: { id: 'user1', personId: 'person1' } };
const inMin = (m: number) => new Date(Date.now() + m * 60_000);
const ymd = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

describe('JoinWaitlistUseCase', () => {
  function build({
    availability = 'FULL',
    existing = null as any,
    customer = { id: 'bc1', is_blocked: false } as any,
    business = { id: 'b1', is_waitlist_enabled: true } as any,
    createError = null as any,
  } = {}) {
    const tx = {
      waitlistEntry: {
        create: jest.fn(async () => {
          if (createError) throw createError;
          return { id: 'w1' };
        }),
        update: jest.fn().mockResolvedValue({ id: 'w-existing' }),
      },
      waitlistEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      business: { findFirst: jest.fn().mockResolvedValue(business) },
      businessCustomer: {
        findFirst: jest.fn().mockResolvedValue(customer),
        create: jest.fn().mockResolvedValue({ id: 'bc-new', is_blocked: false }),
      },
      person: { findUnique: jest.fn().mockResolvedValue({ phone: '1', email: 'a@b.c' }) },
      waitlistEntry: {
        findUnique: jest.fn().mockResolvedValue(existing),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'w1',
          status: 'WAITING',
          businessId: 'b1',
          date: new Date('2030-01-01T00:00:00Z'),
          professionalProfileId: 'pro1',
          queued_at: new Date(),
        }),
        count: jest.fn().mockResolvedValue(2),
      },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    const times = { execute: jest.fn().mockResolvedValue({ status: availability, availableSlots: [] }) };
    return { useCase: new JoinWaitlistUseCase(prisma, times as any), prisma, tx, times };
  }

  const dto = (over: Record<string, unknown> = {}) => ({
    business_slug: 'studio',
    professional_id: 'pro1',
    service_id: 's1',
    date: ymd(3),
    ...over,
  });

  it('entra na fila de dia lotado, registra JOINED e devolve a posicao', async () => {
    const { useCase, tx } = build();
    const res = await useCase.execute(dto(), req);
    expect(res).toMatchObject({ id: 'w1', status: 'WAITING', position: 3 });
    expect(tx.waitlistEvent.create.mock.calls[0][0].data.event_type).toBe('JOINED');
  });

  it('recalcula a disponibilidade no servidor e recusa se ainda ha horario livre', async () => {
    const { useCase, tx } = build({ availability: 'AVAILABLE' });
    await expect(useCase.execute(dto(), req)).rejects.toThrow(/Ainda há horários/);
    expect(tx.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it('nunca aceita dia fechado (fila so para dia lotado)', async () => {
    const { useCase } = build({ availability: 'CLOSED' });
    await expect(useCase.execute(dto(), req)).rejects.toThrow(/não atende nesse dia/);
  });

  it('bloqueia segunda entrada no mesmo dia mesmo trocando profissional/servico', async () => {
    // mesmo que o outro profissional/serviço tenha vaga, a regra "uma vez por dia" vale
    const { useCase } = build({
      existing: { id: 'w0', status: 'WAITING' },
      availability: 'AVAILABLE',
    });
    await expect(
      useCase.execute(dto({ professional_id: 'pro2', service_id: 's2' }), req),
    ).rejects.toThrow(/já está na lista de espera/);
  });

  it('reativa entrada cancelada reiniciando a posicao (queued_at novo)', async () => {
    const { useCase, tx } = build({ existing: { id: 'w0', status: 'CANCELED' } });
    await useCase.execute(dto(), req);
    const data = tx.waitlistEntry.update.mock.calls[0][0].data;
    expect(data.status).toBe('WAITING');
    expect(data.queued_at).toBeInstanceOf(Date);
    expect(tx.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it('converte P2002 (corrida) em erro de negocio claro', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'x',
    });
    const { useCase } = build({ createError: err });
    await expect(useCase.execute(dto(), req)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige service_id ou combo_id, apenas um', async () => {
    const { useCase } = build();
    await expect(useCase.execute(dto({ service_id: undefined }), req)).rejects.toThrow();
    await expect(useCase.execute(dto({ combo_id: 'c1' }), req)).rejects.toThrow();
  });

  it('rejeita dia no passado', async () => {
    const { useCase } = build();
    await expect(useCase.execute(dto({ date: ymd(-2) }), req)).rejects.toThrow(/já passou/);
  });

  it('rejeita negocio sem lista de espera', async () => {
    const { useCase } = build({ business: { id: 'b1', is_waitlist_enabled: false } });
    await expect(useCase.execute(dto(), req)).rejects.toThrow(/não usa lista de espera/);
  });

  it('cria o vinculo cliente-negocio quando ainda nao existe', async () => {
    const { useCase, prisma } = build({ customer: null });
    await useCase.execute(dto(), req);
    expect(prisma.businessCustomer.create).toHaveBeenCalled();
  });
});

describe('computeWaitlistPosition', () => {
  it('conta so quem esta WAITING na frente e e compativel com o profissional', async () => {
    const prisma: any = { waitlistEntry: { count: jest.fn().mockResolvedValue(2) } };
    const queued_at = new Date();

    const position = await computeWaitlistPosition(prisma, {
      id: 'x',
      businessId: 'b1',
      date: new Date('2030-01-01'),
      professionalProfileId: 'pro1',
      queued_at,
    });

    expect(position).toBe(3);
    const where = prisma.waitlistEntry.count.mock.calls[0][0].where;
    expect(where.status).toBe('WAITING');
    expect(where.AND).toHaveLength(2);
  });
});

describe('AcceptWaitlistOfferUseCase', () => {
  function build({ claim = 1, createError = null as any } = {}) {
    const tx = {
      waitlistEntry: { update: jest.fn().mockResolvedValue({}) },
      waitlistEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      waitlistOffer: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'o1',
          waitlistEntryId: 'w1',
          professionalProfileId: 'pro1',
          serviceId: 's1',
          serviceComboId: null,
          slot_start_at_utc: inMin(60),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: claim }),
      },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    const create = {
      createAndReturnId: jest.fn(async (..._args: unknown[]) => {
        if (createError) throw createError;
        return { appointmentId: 'apt1' };
      }),
    };
    return { useCase: new AcceptWaitlistOfferUseCase(prisma, create as any), prisma, tx, create };
  }

  it('aceita: cria o agendamento liberando o hold da propria oferta e converte a entrada', async () => {
    const { useCase, create, tx } = build();

    expect(await useCase.execute('o1', req)).toEqual({ appointment_id: 'apt1' });

    expect(create.createAndReturnId.mock.calls[0][2]).toEqual({ ignoreWaitlistOfferId: 'o1' });
    expect(tx.waitlistEntry.update.mock.calls[0][0].data).toEqual({
      status: 'CONVERTED',
      converted_appointment_id: 'apt1',
    });
    expect(tx.waitlistEvent.create.mock.calls[0][0].data.event_type).toBe('CONVERTED');
  });

  it('revalida prazo e status no servidor no proprio claim (expirada nunca cria agendamento)', async () => {
    const { useCase, create, prisma } = build({ claim: 0 });

    await expect(useCase.execute('o1', req)).rejects.toThrow(/não está mais disponível/);

    const where = prisma.waitlistOffer.updateMany.mock.calls[0][0].where;
    expect(where.status).toBe('PENDING');
    expect(where.expires_at_utc.gt).toBeInstanceOf(Date);
    expect(create.createAndReturnId).not.toHaveBeenCalled();
  });

  it('oferta de outro cliente nao e encontrada', async () => {
    const { useCase, prisma } = build();
    prisma.waitlistOffer.findFirst.mockResolvedValue(null);
    await expect(useCase.execute('o1', req)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.waitlistOffer.findFirst.mock.calls[0][0].where.waitlistEntry).toEqual({
      personId: 'person1',
    });
  });

  it('falha ao agendar devolve a oferta para PENDING e propaga o erro', async () => {
    const { useCase, prisma } = build({ createError: new BadRequestException('conflito') });

    await expect(useCase.execute('o1', req)).rejects.toThrow('conflito');

    const revert = prisma.waitlistOffer.updateMany.mock.calls[1][0];
    expect(revert.where.status).toBe('CONVERTED');
    expect(revert.data.status).toBe('PENDING');
  });
});

describe('DeclineWaitlistOfferUseCase', () => {
  function build({ claim = 1, start = inMin(60) } = {}) {
    const tx = {
      waitlistOffer: { updateMany: jest.fn().mockResolvedValue({ count: claim }) },
      waitlistEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      waitlistOffer: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'o1',
          waitlistEntryId: 'w1',
          businessId: 'b1',
          professionalProfileId: 'pro1',
          slot_start_at_utc: start,
          slot_end_at_utc: new Date(start.getTime() + 1_800_000),
        }),
      },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    const events = { publishSlotFreed: jest.fn().mockResolvedValue(undefined) };
    return { useCase: new DeclineWaitlistOfferUseCase(prisma, events as any), tx, events };
  }

  it('recusa, registra evento e chama o proximo imediatamente', async () => {
    const { useCase, tx, events } = build();
    await useCase.execute('o1', req);
    expect(tx.waitlistOffer.updateMany.mock.calls[0][0].data.status).toBe('DECLINED');
    expect(tx.waitlistEvent.create.mock.calls[0][0].data.event_type).toBe('OFFER_DECLINED');
    expect(events.publishSlotFreed).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'OFFER_DECLINED', excludedPersonId: 'person1' }),
    );
  });

  it('oferta ja respondida/expirada devolve erro claro e nao publica', async () => {
    const { useCase, events } = build({ claim: 0 });
    await expect(useCase.execute('o1', req)).rejects.toBeInstanceOf(BadRequestException);
    expect(events.publishSlotFreed).not.toHaveBeenCalled();
  });
});

describe('LeaveWaitlistUseCase', () => {
  function build({ status = 'WAITING', pending = [] as any[] } = {}) {
    const tx = {
      waitlistEntry: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      waitlistEvent: { create: jest.fn().mockResolvedValue({}) },
      waitlistOffer: {
        findMany: jest.fn().mockResolvedValue(pending),
        updateMany: jest.fn().mockResolvedValue({ count: pending.length }),
      },
    };
    const prisma: any = {
      waitlistEntry: { findFirst: jest.fn().mockResolvedValue({ id: 'w1', status }) },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    const events = { publishSlotFreed: jest.fn().mockResolvedValue(undefined) };
    return { useCase: new LeaveWaitlistUseCase(prisma, events as any), prisma, tx, events };
  }

  it('so o dono sai da fila', async () => {
    const { useCase, prisma } = build();
    await useCase.execute('w1', req);
    expect(prisma.waitlistEntry.findFirst.mock.calls[0][0].where).toEqual({
      id: 'w1',
      personId: 'person1',
    });
  });

  it('cancela a entrada e registra LEFT', async () => {
    const { useCase, tx } = build();
    await useCase.execute('w1', req);
    expect(tx.waitlistEntry.updateMany.mock.calls[0][0].data.status).toBe('CANCELED');
    expect(tx.waitlistEvent.create.mock.calls[0][0].data.event_type).toBe('LEFT');
  });

  it('com oferta pendente: vira SUPERSEDED e a vez passa na hora', async () => {
    const start = inMin(60);
    const { useCase, tx, events } = build({
      pending: [
        {
          id: 'o1',
          businessId: 'b1',
          professionalProfileId: 'pro1',
          slot_start_at_utc: start,
          slot_end_at_utc: new Date(start.getTime() + 1_800_000),
        },
      ],
    });
    await useCase.execute('w1', req);
    expect(tx.waitlistOffer.updateMany.mock.calls[0][0].data.status).toBe('SUPERSEDED');
    expect(events.publishSlotFreed).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'OFFER_SUPERSEDED' }),
    );
  });

  it('entrada ja encerrada nao faz nada', async () => {
    const { useCase, prisma } = build({ status: 'CONVERTED' });
    await useCase.execute('w1', req);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
