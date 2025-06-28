import { PAYMENT_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { InvoicePaymentSucceeded } from './invoice.payment-succeeded';

@Injectable()
export class InvoiceWebhook {
  private readonly logger = new Logger(InvoiceWebhook.name);
  constructor(
    private readonly invoicePaymentSucceeded: InvoicePaymentSucceeded,
  ) {}

  @RabbitSubscribe({
    routingKey: PAYMENT_QUEUES.WEBHOOKS.STRIPE_INVOICE_WEBHOOK_QUEUE,
    queue: PAYMENT_QUEUES.WEBHOOKS.STRIPE_INVOICE_WEBHOOK_QUEUE,
    exchange: RABBIT_EXCHANGE,
  })
  async execute(payload: Stripe.Event) {
    try {
      if (payload.type === 'invoice.payment_succeeded') {
        this.logger.debug(
          `Handling Stripe invoice payment succeeded event: ${payload.id}`,
        );
        await this.invoicePaymentSucceeded.handlePaymentSuccess(payload);
      }
    } catch (error) {
      this.logger.error('Error processing Stripe webhook', error);
    }
  }
}
