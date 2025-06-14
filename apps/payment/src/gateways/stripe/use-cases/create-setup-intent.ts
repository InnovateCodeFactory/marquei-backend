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
  async execute(body: { stripe_customer_id: string; business_id: string }) {
    const { business_id, stripe_customer_id } = body;
    try {
      // Verificar por que ele pagou direto ao inves de so salvar o cartão
      const setupIntent = await this.stripeService.setupIntents.create({
        usage: 'off_session',
        metadata: { business_id },
        customer: stripe_customer_id,
      });

      return {
        client_secret: setupIntent.client_secret,
      };
    } catch (error) {
      this.logger.error('Error creating setup intent', error);
    }
  }
}
