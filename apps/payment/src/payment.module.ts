import { SharedModule } from '@app/shared';
import { Module } from '@nestjs/common';
import { StripeModule } from './gateways/stripe/stripe.module';

@Module({
  imports: [SharedModule, StripeModule],
})
export class PaymentModule {}
