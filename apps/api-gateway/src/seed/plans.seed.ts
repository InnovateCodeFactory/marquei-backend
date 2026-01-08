import { PrismaService } from '@app/shared';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SeedProfessionalPlansUseCase implements OnModuleInit {
  private readonly logger = new Logger(SeedProfessionalPlansUseCase.name);
  plans = [
    {
      name: 'Marquei Free Trial',
      description: 'Plano gratuito de teste por 14 dias.',
      price_in_cents: 0,
      billing_period: 'FREE_TRIAL',
      is_active: true,
      showing_order: 0,
      max_professionals_allowed: 1,
      plan_id: 'free_trial',
      plan_id_play_store: 'free_trial_android',
    },
    {
      name: 'Marquei Basic',
      description: 'Inclui apenas o owner como profissional.',
      price_in_cents: 4990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 1,
      max_professionals_allowed: 1,
      plan_id: 'com.innovatecode.marqueipro.sub.plan_basic',
      plan_id_play_store: 'com.innovatecode.marqueipro.basic:marquei-basic',
    },
    {
      name: 'Owner + 1',
      description: 'Owner + 1 profissional para pequenas equipes.',
      price_in_cents: 5990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 2,
      max_professionals_allowed: 2,
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus1',
      plan_id_play_store:
        'com.innovatecode.marqueipro.owner_plus1:marquei-owner-plus1',
    },
    {
      name: 'Owner + 2',
      description: 'Owner + 2 profissionais com gestão completa.',
      price_in_cents: 7490,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 3,
      max_professionals_allowed: 3,
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus2',
      plan_id_play_store:
        'com.innovatecode.marqueipro.owner_plus2:marquei-owner-plus2',
    },
    {
      name: 'Owner + 3',
      description: 'Owner + 3 profissionais para equipes em expansão.',
      price_in_cents: 8990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 4,
      max_professionals_allowed: 4,
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus3',
      plan_id_play_store:
        'com.innovatecode.marqueipro.owner_plus3:marquei-owner-plus3',
    },
    {
      name: 'Owner + 4',
      description: 'Owner + 4 profissionais com gestão avançada.',
      price_in_cents: 10990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 5,
      max_professionals_allowed: 5,
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus4',
      plan_id_play_store:
        'com.innovatecode.marqueipro.owner_plus4:marquei-owner-plus4',
    },
    {
      name: 'Owner + 5',
      description: 'Owner + 5 profissionais para equipe média.',
      price_in_cents: 12990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 6,
      max_professionals_allowed: 6,
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus5',
      plan_id_play_store: 'com.innovatecode.marqueipro.sub.plan08_owner_plus5',
    },
    {
      name: 'Owner + 6',
      description: 'Owner + 6 profissionais para equipes maiores.',
      price_in_cents: 14990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 7,
      max_professionals_allowed: 7,
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus6',
      plan_id_play_store: 'com.innovatecode.marqueipro.sub.plan08_owner_plus6',
    },
    {
      name: 'Owner + 7',
      description: 'Owner + 7 profissionais para alto volume.',
      price_in_cents: 17990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 8,
      max_professionals_allowed: 8,
      plan_id: 'com.innovatecode.marqueipro.sub.plan08_owner_plus7',
      plan_id_play_store: 'com.innovatecode.marqueipro.sub.plan08_owner_plus7',
    },
    {
      name: 'Owner + 8',
      description: 'Owner + 8 profissionais e agendamento ilimitado.',
      price_in_cents: 20990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 9,
      max_professionals_allowed: 9,
      plan_id: 'com.innovatecode.marqueipro.sub.plan09_owner_plus8',
      plan_id_play_store: 'com.innovatecode.marqueipro.sub.plan09_owner_plus8',
    },
    {
      name: 'Marquei Infinity',
      description: 'Owner + 9 ou mais profissionais ilimitados.',
      price_in_cents: 23990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 10,
      max_professionals_allowed: 999,
      plan_id: 'com.innovatecode.marqueipro.sub.plan10_infinity',
      plan_id_play_store: 'com.innovatecode.marqueipro.sub.plan10_infinity',
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
