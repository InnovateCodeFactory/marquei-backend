import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { CustomerServicePlansController } from './customer-service-plans.controller';
import {
  CreateCustomerServicePlanUseCase,
  ListCustomerServicePlansUseCase,
  UpdateCustomerServicePlanUseCase,
} from './use-cases/customer-service-plans.use-cases';

@Module({
  controllers: [CustomerServicePlansController],
  providers: [
    ResponseHandlerService,
    CreateCustomerServicePlanUseCase,
    ListCustomerServicePlansUseCase,
    UpdateCustomerServicePlanUseCase,
  ],
})
export class CustomerServicePlansModule {}
