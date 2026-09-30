import {
  ListCustomerPlanSubscriptionsUseCase,
  RenewCustomerPlanSubscriptionUseCase,
} from './customer-plan-subscriptions.use-cases';

const user: any = { id: 'u1', current_selected_business_id: 'b1' };

const cycleRow = {
  id: 'cyc2',
  cycle_start: new Date('2031-03-01T00:00:00Z'),
  cycle_end: new Date('2031-03-31T23:59:59Z'),
  credits_granted: 4,
  credits_reserved: 0,
  credits_consumed: 0,
  credits_refunded: 0,
};

function subscriptionRow(over: Record<string, unknown> = {}) {
  return {
    id: 'sub1',
    status: 'ACTIVE',
    price_in_cents_snapshot: 12000,
    current_cycle_start: cycleRow.cycle_start,
    current_cycle_end: cycleRow.cycle_end,
    created_at: new Date(),
    businessCustomer: {
      id: 'bc1',
      person: { id: 'p1', name: 'Joao', phone: '1', email: 'a@b.c' },
    },
    plan: { id: 'plan1', name: 'Mensal', services: [], combos: [] },
    cycles: [cycleRow],
    ...over,
  };
}

const summaryService: any = {
  summarize: jest.fn(async (subs: any[]) =>
    new Map(subs.map((s) => [s.id, { auto_renews: false, credits_remaining: 4 }])),
  ),
};

describe('RenewCustomerPlanSubscriptionUseCase', () => {
  it('cria novo ciclo e receita, sem recriar serie recorrente (renovacao e manual)', async () => {
    const tx = {
      customerServicePlanCycle: { create: jest.fn().mockResolvedValue({}) },
      professionalStatement: { create: jest.fn().mockResolvedValue({}) },
      customerPlanSubscription: { update: jest.fn().mockResolvedValue(subscriptionRow()) },
      recurringAppointmentSeries: { create: jest.fn(), findMany: jest.fn() },
      appointment: { create: jest.fn() },
    };
    const prisma: any = {
      customerPlanSubscription: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'sub1',
          status: 'ACTIVE',
          credits_per_cycle_snapshot: 4,
          price_in_cents_snapshot: 12000,
          revenue_professional_profile_id: 'pro1',
          plan: { name: 'Mensal', cycle_type: 'CALENDAR_MONTH', cycle_interval_months: 1 },
          businessCustomer: { person: { name: 'Joao' } },
        }),
      },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };

    const res: any = await new RenewCustomerPlanSubscriptionUseCase(
      prisma,
      summaryService,
    ).execute('sub1', user);

    expect(tx.customerServicePlanCycle.create).toHaveBeenCalledTimes(1);
    expect(tx.professionalStatement.create.mock.calls[0][0].data).toMatchObject({
      type: 'INCOME',
      value_in_cents: 12000,
    });
    expect(tx.recurringAppointmentSeries.create).not.toHaveBeenCalled();
    expect(tx.appointment.create).not.toHaveBeenCalled();
    expect(res.auto_renews).toBe(false);
  });

  it('nao renova assinatura cancelada', async () => {
    const prisma: any = {
      customerPlanSubscription: {
        findFirst: jest.fn().mockResolvedValue({ id: 'sub1', status: 'CANCELED', plan: {} }),
      },
    };
    await expect(
      new RenewCustomerPlanSubscriptionUseCase(prisma, summaryService).execute('sub1', user),
    ).rejects.toThrow(/cancelada/);
  });
});

describe('ListCustomerPlanSubscriptionsUseCase', () => {
  function build() {
    const prisma: any = {
      customerPlanSubscription: { findMany: jest.fn().mockResolvedValue([subscriptionRow()]) },
    };
    return { useCase: new ListCustomerPlanSubscriptionsUseCase(prisma, summaryService), prisma };
  }

  it('filtra por status, ordena por vencimento e pagina', async () => {
    const { useCase, prisma } = build();

    await useCase.execute({ status: 'ACTIVE', sort: 'cycle_end', page: 2, limit: 20 }, user);

    const args = prisma.customerPlanSubscription.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ businessId: 'b1', status: 'ACTIVE' });
    expect(args.orderBy[0]).toEqual({ current_cycle_end: 'asc' });
    expect(args.take).toBe(20);
    expect(args.skip).toBe(20);
  });

  it('mantem o contrato antigo (array, sem paginacao obrigatoria) e expoe o resumo da assinatura', async () => {
    const { useCase, prisma } = build();

    const res: any[] = await useCase.execute({}, user);

    expect(prisma.customerPlanSubscription.findMany.mock.calls[0][0].take).toBe(200);
    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toMatchObject({ id: 'sub1', auto_renews: false, credits_remaining: 4 });
    expect(res[0].cycle.available_credits).toBe(4);
  });

  it('isola por negocio selecionado', async () => {
    const { useCase, prisma } = build();
    await useCase.execute({ customer_id: 'bc1' }, user);
    expect(prisma.customerPlanSubscription.findMany.mock.calls[0][0].where).toEqual({
      businessId: 'b1',
      businessCustomerId: 'bc1',
    });
  });
});
