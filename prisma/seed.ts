// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Chave-padrão usada no enum/validação da aplicação.
 */
const BenefitKey = {
  PROFESSIONALS: 'PROFESSIONALS',
  REMINDER_CHANNELS: 'REMINDER_CHANNELS',
  CONFIRMATION_ENABLED: 'CONFIRMATION_ENABLED',
  WAITING_LIST_ENABLED: 'WAITING_LIST_ENABLED',
  REVIEW_REQUEST_ENABLED: 'REVIEW_REQUEST_ENABLED',
  APP_POSITION: 'APP_POSITION',
} as const;

async function main() {
  const pro = await prisma.plan.findFirst({ where: { name: 'Profissional' } });
  const premium = await prisma.plan.findFirst({ where: { name: 'Premium' } });

  if (!pro || !premium) {
    throw new Error(
      'Um ou mais planos não foram encontrados. Verifique o banco antes de rodar o seed.',
    );
  }

  await prisma.planBenefit.createMany({
    skipDuplicates: true,
    data: [
      /* ─────────────────────────────── Ordem 1 – Profissionais incluídos ─────────────────────────────── */
      {
        planId: pro.id,
        key: BenefitKey.PROFESSIONALS,
        order: 1,
        stringValue: 'Até 3',
        intValue: 3,
      },
      {
        planId: premium.id,
        key: BenefitKey.PROFESSIONALS,
        order: 1,
        stringValue: 'Até 5',
        intValue: 5,
      },

      /* ─────────────────────────────── Ordem 4 – Canais de lembrete ─────────────────────────────── */
      {
        planId: pro.id,
        key: BenefitKey.REMINDER_CHANNELS,
        order: 4,
        stringValue: 'APP, WhatsApp',
      },
      {
        planId: premium.id,
        key: BenefitKey.REMINDER_CHANNELS,
        order: 4,
        stringValue: 'APP, WhatsApp, E-mail',
      },

      /* ─────────────────────────────── Ordem 5 – Confirmação de agendamento ─────────────────────────────── */
      {
        planId: pro.id,
        key: BenefitKey.CONFIRMATION_ENABLED,
        order: 5,
        boolValue: false,
      },
      {
        planId: premium.id,
        key: BenefitKey.CONFIRMATION_ENABLED,
        order: 5,
        boolValue: true,
      },

      /* ─────────────────────────────── Ordem 3 – Lista de espera ─────────────────────────────── */
      {
        planId: pro.id,
        key: BenefitKey.WAITING_LIST_ENABLED,
        order: 3,
        boolValue: false,
      },
      {
        planId: premium.id,
        key: BenefitKey.WAITING_LIST_ENABLED,
        order: 3,
        boolValue: true,
      },

      /* ─────────────────────────────── Ordem 6 – Pedido de avaliação ─────────────────────────────── */
      {
        planId: pro.id,
        key: BenefitKey.REVIEW_REQUEST_ENABLED,
        order: 6,
        boolValue: true,
      },
      {
        planId: premium.id,
        key: BenefitKey.REVIEW_REQUEST_ENABLED,
        order: 6,
        boolValue: true,
      },

      /* ─────────────────────────────── Ordem 2 – Posição no app ─────────────────────────────── */
      {
        planId: pro.id,
        key: BenefitKey.APP_POSITION,
        order: 2,
        stringValue: 'Média',
      },
      {
        planId: premium.id,
        key: BenefitKey.APP_POSITION,
        order: 2,
        stringValue: 'Prioritária',
      },
    ],
  });
}

main()
  .then(() => {
    console.log('✅ Seed executado com sucesso.');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
