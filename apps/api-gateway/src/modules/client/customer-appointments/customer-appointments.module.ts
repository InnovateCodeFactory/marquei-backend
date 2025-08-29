import { Module } from '@nestjs/common';
import { CustomerAppointmentsController } from './customer-appointments.controller';
import {
  CreateAppointmentUseCase,
  GetCustomerAppointmentsUseCase,
  GetNextAppointmentUseCase,
} from './use-cases';

@Module({
  controllers: [CustomerAppointmentsController],
  providers: [
    CreateAppointmentUseCase,
    GetNextAppointmentUseCase,
    GetCustomerAppointmentsUseCase,
  ],
})
export class CustomerAppointmentsModule {}
