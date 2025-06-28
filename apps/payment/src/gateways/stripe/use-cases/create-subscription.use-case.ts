import { PrismaService } from '@app/shared';
import { PAYMENT_QUEUES } from '@app/shared/modules/rmq/constants';
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
    queue: PAYMENT_QUEUES.USE_CASES.CREATE_STRIPE_SUBSCRIPTION_QUEUE,
    routingKey: PAYMENT_QUEUES.USE_CASES.CREATE_STRIPE_SUBSCRIPTION_QUEUE,
  })
  async execute(data: {
    price_id: string;
    stripe_customer_id: string;
    business_id: string;
  }) {
    const { price_id, stripe_customer_id, business_id } = data;

    try {
      if (!price_id || !stripe_customer_id) {
        throw new Error('Price ID and Stripe Customer ID are required');
      }

      const session = await this.stripe.checkout.sessions.create({
        line_items: [{ price: price_id, quantity: 1 }],
        mode: 'subscription',
        customer: stripe_customer_id,
        metadata: { business_id },
        success_url: 'http://192.168.15.84:3000/api/webhooks/stripe/success',
        cancel_url: 'exp://192.168.15.84:8081/--/cancel',
      });

      this.logger.debug(session);

      return {
        url: session.url,
      };
    } catch (error) {
      this.logger.error('Error creating subscription', error);
      return null;
    }
  }
}
