import { EnvSchemaType } from '@app/shared/environment';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { STRIPE_PAYMENT_GATEWAY } from './stripe.constants';
import { CreateCustomerUseCase } from './use-cases/create-customer.use-case';
import { CreateSubscriptionUseCase } from './use-cases/create-subscription.use-case';
import { InvoicePaymentSucceeded } from './webhooks/invoice/invoice.payment-succeeded';
import { InvoiceWebhook } from './webhooks/invoice/invoice.webhook';
import { StripeWebhookHandler } from './webhooks/stripe-webhook-handler';

@Global()
@Module({
  providers: [
    {
      provide: STRIPE_PAYMENT_GATEWAY,
      useFactory: (configService: ConfigService<EnvSchemaType>) => {
        return new Stripe(configService.get<string>('STRIPE_SECRET_KEY'), {
          typescript: true,
        });
      },
      inject: [ConfigService],
    },
    CreateCustomerUseCase,
    StripeWebhookHandler,
    InvoiceWebhook,
    InvoicePaymentSucceeded,
    CreateSubscriptionUseCase,
  ],
  exports: [STRIPE_PAYMENT_GATEWAY],
})
export class StripeModule {}
