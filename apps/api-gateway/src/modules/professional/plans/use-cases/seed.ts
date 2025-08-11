import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SeedProfessionalPlansUseCase {
  plans = [
    {
      id: 'f6c5fdad-3c2a-4b8f-8111-77c3a1b7b9e0',
      name: 'Plano Grátis',
      description: 'Plano básico gratuito para profissionais iniciantes.',
      price: 0,
      period: 'MONTH',
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      updated_at: new Date('2024-01-01T00:00:00.000Z'),
      deleted_at: null,
    },
    {
      id: '1e2b3c4d-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
      name: 'Plano Profissional',
      description: 'Plano pago para profissionais que buscam mais recursos.',
      price: 4990,
      period: 'MONTH',
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      updated_at: new Date('2024-01-01T00:00:00.000Z'),
      deleted_at: null,
    },
    {
      id: '7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
      name: 'Plano Premium',
      description:
        'Plano completo para profissionais que querem o máximo desempenho.',
      price: 9990,
      period: 'MONTH',
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      updated_at: new Date('2024-01-01T00:00:00.000Z'),
      deleted_at: null,
    },
  ];
  planBenefits = [
    {
      id: 'b1',
      plan_id: 'f6c5fdad-3c2a-4b8f-8111-77c3a1b7b9e0',
      benefit: 'Agendamentos ilimitados',
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      updated_at: new Date('2024-01-01T00:00:00.000Z'),
      deleted_at: null,
    },
    {
      id: 'b2',
      plan_id: 'f6c5fdad-3c2a-4b8f-8111-77c3a1b7b9e0',
      benefit: 'Perfil público na plataforma',
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      updated_at: new Date('2024-01-01T00:00:00.000Z'),
      deleted_at: null,
    },
    {
      id: 'b3',
      plan_id: '1e2b3c4d-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
      benefit: 'Agendamento online',
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      updated_at: new Date('2024-01-01T00:00:00.000Z'),
      deleted_at: null,
    },
    {
      id: 'b4',
      plan_id: '1e2b3c4d-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
      benefit: 'Integração com WhatsApp',
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      updated_at: new Date('2024-01-01T00:00:00.000Z'),
      deleted_at: null,
    },
    {
      id: 'b5',
      plan_id: '7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
      benefit: 'Suporte prioritário',
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      updated_at: new Date('2024-01-01T00:00:00.000Z'),
      deleted_at: null,
    },
    {
      id: 'b6',
      plan_id: '7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
      benefit: 'Página personalizada',
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      updated_at: new Date('2024-01-01T00:00:00.000Z'),
      deleted_at: null,
    },
  ];
  constructor(private readonly prisma: PrismaService) {}

  async run() {
    // for (const plan of this.plans) {
    //   await this.prisma.plan.upsert({
    //     where: { id: plan.id },
    //     update: {
    //       name: plan.name,
    //       description: plan.description,
    //       price_in_cents: plan.price,
    //       period: plan.period,
    //       created_at: plan.created_at,
    //       updated_at: plan.updated_at,
    //       deleted_at: plan.deleted_at,
    //     },
    //     create: plan,
    //   });
    // }
    // for (const benefit of this.planBenefits) {
    //   await this.prisma.planBenefit.upsert({
    //     where: { id: benefit.id },
    //     update: {
    //       plan_id: benefit.plan_id,
    //       benefit: benefit.benefit,
    //       created_at: benefit.created_at,
    //       updated_at: benefit.updated_at,
    //       deleted_at: benefit.deleted_at,
    //     },
    //     create: benefit,
    //   });
    // }
  }
}
