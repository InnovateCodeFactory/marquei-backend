import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { CustomerPlansController } from './customer-plans.controller';
import { GetCustomerPlansUseCase } from './use-cases/get-customer-plans.use-case';

@Module({
  controllers: [CustomerPlansController],
  providers: [ResponseHandlerService, GetCustomerPlansUseCase],
})
export class CustomerPlansModule {}
