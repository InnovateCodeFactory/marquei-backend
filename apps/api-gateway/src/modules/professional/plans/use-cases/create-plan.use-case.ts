import { PrismaService } from '@app/shared';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class CreatePlanUseCase implements OnModuleInit {
  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    await this.execute();
    console.log('Stripe plans created successfully');
  }

  async execute() {
    await this.prismaService.plan.createMany({
      data: [
        {
          name: 'Profissional',
          description: 'Plano Profissional Mensal',
          price_in_cents: 4990,
          billing_period: 'MONTHLY',
          stripeProductId: 'prod_SOhkLVWyGqVq2b',
          stripePriceId: 'price_1RTuKcPUXZY9v8VpWIOktuqp',
        },
        {
          name: 'Profissional',
          description: 'Plano Profissional Anual',
          price_in_cents: 49900,
          billing_period: 'YEARLY',
          stripeProductId: 'prod_SOhkLVWyGqVq2b',
          stripePriceId: 'price_1RZ0KiPUXZY9v8VpwUWuEJwc',
        },
      ],
    });
  }
}
