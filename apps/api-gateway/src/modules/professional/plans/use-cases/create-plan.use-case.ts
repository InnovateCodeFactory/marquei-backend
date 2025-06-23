import { PrismaService } from '@app/shared';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class CreatePlanUseCase implements OnModuleInit {
  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    // await this.execute();
    // console.log('Stripe plans created successfully');
  }

  async execute() {
    await this.prismaService.plan.createMany({
      data: [
        {
          name: 'Premium',
          description: 'Plano Premium Mensal',
          stripeProductId: 'prod_SXKbcTMvyFoju3',
          stripePriceId: 'price_1RcFwePUXZY9v8VpzVf7ZRfO',
          price_in_cents: 9990,
          billing_period: 'MONTHLY',
          showing_order: 2,
        },
        {
          name: 'Premium',
          description: 'Plano Premium Anual',
          stripeProductId: 'prod_SXKbcTMvyFoju3',
          stripePriceId: 'price_1RcFwyPUXZY9v8VpHTXvzm16',
          price_in_cents: 99900,
          billing_period: 'YEARLY',
          showing_order: 2,
        },
      ],
    });
    // await this.prismaService.plan.createMany({
    //   data: [
    //     {
    //       name: 'Profissional',
    //       description: 'Plano Profissional Mensal',
    //       price_in_cents: 4990,
    //       billing_period: 'MONTHLY',
    //       stripeProductId: 'prod_SOhkLVWyGqVq2b',
    //       stripePriceId: 'price_1RTuKcPUXZY9v8VpWIOktuqp',
    //     },
    //     {
    //       name: 'Profissional',
    //       description: 'Plano Profissional Anual',
    //       price_in_cents: 49900,
    //       billing_period: 'YEARLY',
    //       stripeProductId: 'prod_SOhkLVWyGqVq2b',
    //       stripePriceId: 'price_1RZ0KiPUXZY9v8VpwUWuEJwc',
    //     },
    //   ],
    // });
  }
}
