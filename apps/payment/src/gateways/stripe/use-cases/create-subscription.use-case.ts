import { PrismaService } from '@app/shared';
import { CREATE_STRIPE_SUBSCRIPTION_QUEUE } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_PAYMENT_GATEWAY } from '../stripe.constants';

@Injectable()
export class CreateSubscriptionUseCase {
  private readonly logger = new Logger(CreateSubscriptionUseCase.name);

  constructor(
    @Inject(STRIPE_PAYMENT_GATEWAY)
    private readonly stripe: Stripe,

    private readonly prismaService: PrismaService,
  ) {}

  @RabbitRPC({
    exchange: RABBIT_EXCHANGE,
    queue: CREATE_STRIPE_SUBSCRIPTION_QUEUE,
    routingKey: CREATE_STRIPE_SUBSCRIPTION_QUEUE,
  })
  async execute({
    price_id,
    stripe_customer_id,
    business_id,
  }: {
    price_id: string;
    stripe_customer_id: string;
    business_id: string;
  }) {
    try {
      if (!price_id || !stripe_customer_id) {
        throw new Error('Price ID and Stripe Customer ID are required');
      }

      const product = await this.prismaService.plan.findFirst({
        where: {
          stripePriceId: price_id,
        },
        select: {
          price_in_cents: true,
        },
      });

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: product.price_in_cents,
        currency: 'brl',
        customer: stripe_customer_id,
      });

      const { client_secret } = paymentIntent;

      return {
        client_secret,
      };
    } catch (error) {
      this.logger.error('Error creating subscription', error);
      return null;
    }
  }
}
