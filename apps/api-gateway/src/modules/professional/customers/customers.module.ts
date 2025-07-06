import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CreateCustomerUseCase, GetCustomerDetailsUseCase } from './use-cases';
import { FindCustomersUseCase } from './use-cases/find-customers.use-case';

@Module({
  controllers: [CustomersController],
  providers: [
    ResponseHandlerService,
    CreateCustomerUseCase,
    FindCustomersUseCase,
    GetCustomerDetailsUseCase,
  ],
})
export class CustomersModule {}
