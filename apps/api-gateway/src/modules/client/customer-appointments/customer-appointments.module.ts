import { Module } from '@nestjs/common';
import { CustomerAppointmentsController } from './customer-appointments.controller';
import {
  CreateAppointmentUseCase,
  GetCustomerAppointmentsUseCase,
  GetNextAppointmentUseCase,
  ConfirmCustomerAppointmentUseCase,
  CancelCustomerAppointmentUseCase,
} from './use-cases';

@Module({
  controllers: [CustomerAppointmentsController],
  providers: [
    CreateAppointmentUseCase,
    GetNextAppointmentUseCase,
    GetCustomerAppointmentsUseCase,
    ConfirmCustomerAppointmentUseCase,
    CancelCustomerAppointmentUseCase,
  ],
})
export class CustomerAppointmentsModule {}
