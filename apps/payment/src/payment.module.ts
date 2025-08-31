import { LibsSharedModule } from '@app/shared';
import { Module } from '@nestjs/common';
import { StripeModule } from './gateways/stripe/stripe.module';

@Module({
  imports: [LibsSharedModule, StripeModule],
})
export class PaymentModule {}
