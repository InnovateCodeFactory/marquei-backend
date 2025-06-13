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
  ) {}

  @RabbitRPC({
    exchange: RABBIT_EXCHANGE,
    queue: CREATE_STRIPE_SUBSCRIPTION_QUEUE,
    routingKey: CREATE_STRIPE_SUBSCRIPTION_QUEUE,
  })
  async execute({
    price_id,
    stripe_customer_id,
  }: {
    price_id: string;
    stripe_customer_id: string;
  }) {
    try {
      if (!price_id || !stripe_customer_id) {
        throw new Error('Price ID and Stripe Customer ID are required');
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: stripe_customer_id,
        items: [{ price: price_id }],
        expand: [
          'latest_invoice.payment_intent',
          'latest_invoice.lines.data.price',
        ],
        payment_behavior: 'default_incomplete',
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice & {
        payment_intent?: Stripe.PaymentIntent;
      };

      const clientSecret = invoice.payment_intent?.client_secret;

      return { clientSecret };
    } catch (error) {
      this.logger.error('Error creating subscription', error);
      return null;
    }
  }
}
