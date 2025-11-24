import { Module } from '@nestjs/common';
import {
  RevenueCatCancellationUseCase,
  RevenueCatHandleProductChangeUseCase,
  RevenueCatInitialPurchaseUseCase,
  RevenueCatNonRenewingPurchaseUseCase,
  RevenueCatRenewalUseCase,
  RevenueCatUncancellationUseCase,
  RevenueCatExpirationUseCase,
  RevenueCatBillingIssueUseCase,
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
    RevenueCatExpirationUseCase,
    RevenueCatBillingIssueUseCase,
  ],
})
export class RevenueCatModule {}
