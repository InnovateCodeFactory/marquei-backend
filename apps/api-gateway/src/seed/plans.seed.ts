import { PrismaService } from '@app/shared';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SeedProfessionalPlansUseCase implements OnModuleInit {
  private readonly logger = new Logger(SeedProfessionalPlansUseCase.name);
  plans = [
    {
      name: 'Marquei Free Trial',
      description: 'Plano gratuito de teste por 14 dias.',
      plan_id: 'free_trial',
      max_professionals_allowed: 1,
      price_in_cents: 0,
      billing_period: 'FREE_TRIAL',
      is_active: false,
      showing_order: 0,
    },
    {
      name: 'Marquei Basic',
      description: 'Inclui apenas o owner como profissional.',
      plan_id: 'com.innovatecode.marqueipro.sub.plan_basic',
      max_professionals_allowed: 1,
      price_in_cents: 4990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 1,
    },
    {
      name: 'Owner + 1',
      description: 'Owner + 1 profissional para pequenas equipes.',
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus1',
      max_professionals_allowed: 2,
      price_in_cents: 5990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 2,
    },
    {
      name: 'Owner + 2',
      description: 'Owner + 2 profissionais com gestão completa.',
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus2',
      max_professionals_allowed: 3,
      price_in_cents: 7490,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 3,
    },
    {
      name: 'Owner + 3',
      description: 'Owner + 3 profissionais para equipes em expansão.',
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus3',
      max_professionals_allowed: 4,
      price_in_cents: 8990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 4,
    },
    {
      name: 'Owner + 4',
      description: 'Owner + 4 profissionais com gestão avançada.',
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus4',
      max_professionals_allowed: 5,
      price_in_cents: 10990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 5,
    },
    {
      name: 'Owner + 5',
      description: 'Owner + 5 profissionais para equipe média.',
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus5',
      max_professionals_allowed: 6,
      price_in_cents: 12990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 6,
    },
    {
      name: 'Owner + 6',
      description: 'Owner + 6 profissionais para equipes maiores.',
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus6',
      max_professionals_allowed: 7,
      price_in_cents: 14990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 7,
    },
    {
      name: 'Owner + 7',
      description: 'Owner + 7 profissionais para alto volume.',
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus7',
      max_professionals_allowed: 8,
      price_in_cents: 17990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 8,
    },
    {
      name: 'Owner + 8',
      description: 'Owner + 8 profissionais e agendamento ilimitado.',
      plan_id: 'com.innovatecode.marqueipro.sub.plan09_owner_plus8',
      max_professionals_allowed: 9,
      price_in_cents: 20990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 9,
    },
    {
      name: 'Marquei Infinity',
      description: 'Owner + 9 ou mais profissionais ilimitados.',
      plan_id: 'com.innovatecode.marqueipro.sub.plan10_infinity',
      max_professionals_allowed: 999,
      price_in_cents: 23990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 10,
    },
  ];
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // await this.run();
  }

  async run() {
    await this.prisma.plan.createMany({
      data: this.plans.map((plan) => ({
        ...plan,
        billing_period: plan.billing_period.toUpperCase() as any,
      })),
      skipDuplicates: true,
    });

    this.logger.debug(`Plans created`);
  }
}
