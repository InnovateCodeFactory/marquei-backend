import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { CustomerPlanSubscriptionsController } from './customer-plan-subscriptions.controller';
import {
  CreateCustomerPlanSubscriptionUseCase,
  ListCustomerPlanSubscriptionsUseCase,
  RenewCustomerPlanSubscriptionUseCase,
  UpdateCustomerPlanSubscriptionStatusUseCase,
} from './use-cases/customer-plan-subscriptions.use-cases';

@Module({
  controllers: [CustomerPlanSubscriptionsController],
  providers: [
    ResponseHandlerService,
    CreateCustomerPlanSubscriptionUseCase,
    ListCustomerPlanSubscriptionsUseCase,
    RenewCustomerPlanSubscriptionUseCase,
    UpdateCustomerPlanSubscriptionStatusUseCase,
  ],
})
export class CustomerPlanSubscriptionsModule {}
