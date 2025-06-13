import { EnvSchemaType } from '@app/shared/environment';
import {
  STRIPE_CUSTOMER_SUBSCRIPTION_QUEUE,
  STRIPE_INVOICE_WEBHOOK_QUEUE,
  STRIPE_WEBHOOK_HANDLER_QUEUE,
} from '@app/shared/modules/rmq/constants';
import {
  RABBIT_EXCHANGE,
  RmqService,
} from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { STRIPE_PAYMENT_GATEWAY } from '../stripe.constants';

@Injectable()
export class StripeWebhookHandler {
  private readonly logger = new Logger(StripeWebhookHandler.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService<EnvSchemaType>,
    private readonly rmqService: RmqService,

    @Inject(STRIPE_PAYMENT_GATEWAY)
    private readonly stripe: Stripe,
  ) {
    this.webhookSecret = this.configService.getOrThrow('STRIPE_WEBHOOK_SECRET');
  }

  @RabbitSubscribe({
    routingKey: STRIPE_WEBHOOK_HANDLER_QUEUE,
    queue: STRIPE_WEBHOOK_HANDLER_QUEUE,
    exchange: RABBIT_EXCHANGE,
  })
  async execute({
    rawBody,
    signature,
  }: {
    rawBody: string;
    signature: string;
  }) {
    try {
      const eventVerified = await this.stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        this.webhookSecret,
      );

      if (eventVerified.type?.startsWith('invoice.')) {
        this.logger.debug(
          `Handling Stripe webhook event: ${eventVerified.type}`,
        );
        await this.handleEvent({
          event: eventVerified,
          queue: STRIPE_INVOICE_WEBHOOK_QUEUE,
        });
      }

      if (eventVerified.type?.startsWith('customer.subscription.')) {
        await this.handleEvent({
          event: eventVerified,
          queue: STRIPE_CUSTOMER_SUBSCRIPTION_QUEUE,
        });
      }
    } catch (error) {
      this.logger.error('Error handling Stripe webhook', error);
    }
  }

  private async handleEvent({
    event,
    queue,
  }: {
    event: Stripe.Event;
    queue: string;
  }) {
    await this.rmqService.publishToQueue({
      payload: event,
      routingKey: queue,
    });
  }
}
