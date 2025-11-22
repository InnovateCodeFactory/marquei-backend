import { LibsSharedModule } from '@app/shared';
import { Module } from '@nestjs/common';
import { RevenueCatModule } from './gateways/revenuecat/revenuecat.module';
import { StripeModule } from './gateways/stripe/stripe.module';

@Module({
  imports: [LibsSharedModule, StripeModule, RevenueCatModule],
})
export class PaymentModule {}
