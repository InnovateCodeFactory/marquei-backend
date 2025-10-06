import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { SeedCustomersService } from './seed';
import {
  CreateCustomerUseCase,
  GetCustomerAppointmentsUseCase,
  GetCustomerDetailsUseCase,
} from './use-cases';
import { FindCustomersUseCase } from './use-cases/find-customers.use-case';
import { UpdateCustomerUseCase } from './use-cases/update-customer.use-case';

@Module({
  controllers: [CustomersController],
  providers: [
    ResponseHandlerService,
    SeedCustomersService,
    CreateCustomerUseCase,
    FindCustomersUseCase,
    GetCustomerDetailsUseCase,
    GetCustomerAppointmentsUseCase,
    UpdateCustomerUseCase,
  ],
})
export class CustomersModule {}
