import { PrismaService } from '@app/shared';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SeedProfessionalPlansUseCase implements OnModuleInit {
  private readonly logger = new Logger(SeedProfessionalPlansUseCase.name);
  plans = [
    {
      id: 'cmbsraj1j0000yxm0u4sd1vom',
      name: 'Profissional',
      description:
        'Feito para negócios em crescimento que atendem com uma pequena equipe. Comunique-se por WhatsApp, confirme agendamentos automaticamente e ofereça uma experiência mais completa ao cliente.',
      stripeProductId: 'prod_SY4Ptq2wQK3RGZ',
      stripePriceId: 'price_1RcyGVPUXZY9v8Vp8kZxxWaP',
      price_in_cents: 5990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 1,
    },
    {
      id: 'cmc5jmrm70000yx86or26jwl2',
      name: 'Premium',
      description:
        'A solução mais completa para empresas com alto volume de agendamentos ou equipes maiores. Ative a lista de espera, esteja em destaque nas pesquisas no APP de clientes e ofereça a melhor experiência possível.',
      stripeProductId: 'prod_SY4OEVfS7ElDiM',
      stripePriceId: 'price_1RcyFsPUXZY9v8VpUIycE5Vb',
      price_in_cents: 10990,
      billing_period: 'MONTHLY',
      is_active: true,
      showing_order: 2,
    },
    {
      id: 'cmc5k76ae0000yxdmds5lawuo',
      name: 'Teste Diário',
      description: null,
      stripeProductId: 'prod_TAw0vlNPhAhxP3',
      stripePriceId: 'price_1SEa8sPUXZY9v8Vp8vP3Jblf',
      price_in_cents: 990,
      billing_period: 'MONTHLY',
      is_active: false,
      showing_order: 0,
    },
    {
      id: 'cmc5k76ae0000yxlmps5lawuo',
      name: 'Teste Gratuito',
      description: 'Plano de teste gratuito para novos usuários',
      stripeProductId: '1',
      stripePriceId: '1',
      price_in_cents: 0,
      billing_period: 'FREE_TRIAL',
      is_active: false,
      showing_order: null,
    },
  ];
  planBenefits = [
    {
      id: 'cmc8e9k2b0000yxpwx27175cl',
      planId: 'cmbsraj1j0000yxm0u4sd1vom',
      key: 'PROFESSIONALS',
      order: 1,
      stringValue: 'Até 3',
      intValue: 3,
      boolValue: null,
    },
    {
      id: 'cmc8e9k2b0001yxpwsk2ib3sp',
      planId: 'cmc5jmrm70000yx86or26jwl2',
      key: 'PROFESSIONALS',
      order: 1,
      stringValue: 'Até 5',
      intValue: 5,
      boolValue: null,
    },
    {
      id: 'cmc8e9k2b0002yxpw75yqaair',
      planId: 'cmbsraj1j0000yxm0u4sd1vom',
      key: 'REMINDER_CHANNELS',
      order: 4,
      stringValue: 'APP, WhatsApp',
      intValue: null,
      boolValue: null,
    },
    {
      id: 'cmc8e9k2b0003yxpwysfs6bv8',
      planId: 'cmc5jmrm70000yx86or26jwl2',
      key: 'REMINDER_CHANNELS',
      order: 4,
      stringValue: 'APP, WhatsApp, E-mail',
      intValue: null,
      boolValue: null,
    },
    {
      id: 'cmc8e9k2b0004yxpwcu2fs1rq',
      planId: 'cmbsraj1j0000yxm0u4sd1vom',
      key: 'CONFIRMATION_ENABLED',
      order: 5,
      stringValue: null,
      intValue: null,
      boolValue: false,
    },
    {
      id: 'cmc8e9k2b0005yxpw77ya0pui',
      planId: 'cmc5jmrm70000yx86or26jwl2',
      key: 'CONFIRMATION_ENABLED',
      order: 5,
      stringValue: null,
      intValue: null,
      boolValue: true,
    },
    {
      id: 'cmc8e9k2b0006yxpwjixqhar4',
      planId: 'cmbsraj1j0000yxm0u4sd1vom',
      key: 'WAITING_LIST_ENABLED',
      order: 3,
      stringValue: null,
      intValue: null,
      boolValue: false,
    },
    {
      id: 'cmc8e9k2b0007yxpwtcmorjz3',
      planId: 'cmc5jmrm70000yx86or26jwl2',
      key: 'WAITING_LIST_ENABLED',
      order: 3,
      stringValue: null,
      intValue: null,
      boolValue: true,
    },
    {
      id: 'cmc8e9k2b0008yxpwttftr9r8',
      planId: 'cmbsraj1j0000yxm0u4sd1vom',
      key: 'REVIEW_REQUEST_ENABLED',
      order: 6,
      stringValue: null,
      intValue: null,
      boolValue: true,
    },
    {
      id: 'cmc8e9k2b0009yxpwbdlr6ik8',
      planId: 'cmc5jmrm70000yx86or26jwl2',
      key: 'REVIEW_REQUEST_ENABLED',
      order: 6,
      stringValue: null,
      intValue: null,
      boolValue: true,
    },
    {
      id: 'cmc8e9k2b000ayxpwm8ww9kp3',
      planId: 'cmbsraj1j0000yxm0u4sd1vom',
      key: 'APP_POSITION',
      order: 2,
      stringValue: 'Normal',
      intValue: null,
      boolValue: null,
    },
    {
      id: 'cmc8e9k2b000byxpwp29tn469',
      planId: 'cmc5jmrm70000yx86or26jwl2',
      key: 'APP_POSITION',
      order: 2,
      stringValue: 'Prioritária',
      intValue: null,
      boolValue: null,
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

    await this.prisma.planBenefit.createMany({
      data: this.planBenefits as any[],
      skipDuplicates: true,
    });

    this.logger.debug(`Plan benefits created`);
  }
}
