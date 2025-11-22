import { Module } from '@nestjs/common';
import {
  RevenueCatCancellationUseCase,
  RevenueCatHandleProductChangeUseCase,
  RevenueCatInitialPurchaseUseCase,
  RevenueCatNonRenewingPurchaseUseCase,
  RevenueCatRenewalUseCase,
  RevenueCatUncancellationUseCase,
} from './use-cases';
import { RevenueCatWebhookHandlerService } from './webhooks';

@Module({
  providers: [
    RevenueCatWebhookHandlerService,
    RevenueCatHandleProductChangeUseCase,
    RevenueCatCancellationUseCase,
    RevenueCatInitialPurchaseUseCase,
    RevenueCatRenewalUseCase,
    RevenueCatUncancellationUseCase,
    RevenueCatNonRenewingPurchaseUseCase,
  ],
})
export class RevenueCatModule {}
