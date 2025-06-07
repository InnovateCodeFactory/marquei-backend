import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CreateCustomerUseCase } from './use-cases';
import { FindCustomersUseCase } from './use-cases/find-customers.use-case';

@Module({
  controllers: [CustomersController],
  providers: [
    ResponseHandlerService,
    CreateCustomerUseCase,
    FindCustomersUseCase,
  ],
})
export class CustomersModule {}
