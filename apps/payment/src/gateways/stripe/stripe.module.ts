import { EnvSchemaType } from '@app/shared/environment';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { STRIPE_PAYMENT_GATEWAY } from './stripe.constants';
import { CreatePaymentUseCase } from './use-cases/create-payment.use-case';

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
    CreatePaymentUseCase,
  ],
  exports: [STRIPE_PAYMENT_GATEWAY],
})
export class StripeModule {}
