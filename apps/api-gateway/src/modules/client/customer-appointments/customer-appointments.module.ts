import { Module } from '@nestjs/common';
import { CustomerAppointmentsController } from './customer-appointments.controller';
import {
  CreateAppointmentUseCase,
  GetCustomerAppointmentsUseCase,
  GetNextAppointmentUseCase,
  ConfirmCustomerAppointmentUseCase,
  CancelCustomerAppointmentUseCase,
  RescheduleCustomerAppointmentUseCase,
} from './use-cases';

@Module({
  controllers: [CustomerAppointmentsController],
  providers: [
    CreateAppointmentUseCase,
    GetNextAppointmentUseCase,
    GetCustomerAppointmentsUseCase,
    ConfirmCustomerAppointmentUseCase,
    CancelCustomerAppointmentUseCase,
    RescheduleCustomerAppointmentUseCase,
  ],
})
export class CustomerAppointmentsModule {}
