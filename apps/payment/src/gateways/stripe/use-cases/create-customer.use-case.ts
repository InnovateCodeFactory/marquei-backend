import { PrismaService } from '@app/shared';
import { PAYMENT_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_PAYMENT_GATEWAY } from '../stripe.constants';

@Injectable()
export class CreateCustomerUseCase implements OnModuleInit {
  private readonly logger = new Logger(CreateCustomerUseCase.name);

  constructor(
    private readonly prismaService: PrismaService,

    @Inject(STRIPE_PAYMENT_GATEWAY)
    private readonly stripe: Stripe,
  ) {}

  async onModuleInit() {
    // await this.execute({ businessId: 'cmenq459a0001re01jufkjvwq' });
  }

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    queue: PAYMENT_QUEUES.USE_CASES.CREATE_STRIPE_CUSTOMER_QUEUE,
    routingKey: PAYMENT_QUEUES.USE_CASES.CREATE_STRIPE_CUSTOMER_QUEUE,
  })
  async execute({ businessId }: { businessId: string }) {
    try {
      const business = await this.prismaService.business.findUnique({
        where: { id: businessId },
      });

      if (!business)
        throw new Error(`Business with ID ${businessId} not found`);

      const stripeCustomer = await this.stripe.customers.create({
        name: business.name,
        email: business.email,
        metadata: {
          businessId: business.id,
        },
      });

      const freePlan = await this.prismaService.plan.findFirst({
        where: {
          billing_period: 'FREE_TRIAL',
        },
        select: {
          id: true,
        },
      });

      if (!freePlan) {
        this.logger.error('Free trial plan not found in the database');
        return;
      }

      await Promise.all([
        this.prismaService.business.update({
          where: { id: businessId },
          data: {
            stripe_customer_id: stripeCustomer.id,
          },
        }),
        this.prismaService.businessSubscription.create({
          data: {
            business: {
              connect: { id: businessId },
            },
            stripeCustomerId: stripeCustomer.id,
            status: 'ACTIVE',
            plan: {
              connect: { id: freePlan.id },
            },
            current_period_start: new Date(),
            current_period_end: new Date(
              Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days
            ),
          },
        }),
      ]);

      this.logger.debug(
        `Stripe customer created for businessId ${businessId}: ${stripeCustomer.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error creating Stripe customer for businessId ${businessId}:`,
        error,
      );
    }
  }
}
