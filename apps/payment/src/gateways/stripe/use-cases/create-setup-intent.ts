import { STRIPE_SETUP_INTENT_QUEUE } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_PAYMENT_GATEWAY } from '../stripe.constants';

@Injectable()
export class CreateSetupIntentUseCase {
  private readonly logger = new Logger(CreateSetupIntentUseCase.name);

  constructor(
    @Inject(STRIPE_PAYMENT_GATEWAY)
    private readonly stripeService: Stripe,
  ) {}

  @RabbitRPC({
    exchange: RABBIT_EXCHANGE,
    queue: STRIPE_SETUP_INTENT_QUEUE,
    routingKey: STRIPE_SETUP_INTENT_QUEUE,
  })
  async execute({
    business_id,
    stripe_customer_id,
  }: {
    stripe_customer_id: string;
    business_id: string;
  }) {
    try {
      const setupIntent = await this.stripeService.setupIntents.create({
        usage: 'off_session',
        metadata: { business_id },
        customer: stripe_customer_id,
      });

      this.logger.debug(setupIntent);

      return {
        client_secret: setupIntent.client_secret,
      };
    } catch (error) {
      this.logger.error('Error creating setup intent', error);
    }
  }
}
