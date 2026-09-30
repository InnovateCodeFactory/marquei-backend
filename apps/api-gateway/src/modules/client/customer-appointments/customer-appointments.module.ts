import { Module } from '@nestjs/common';
import { CustomerAppointmentsController } from './customer-appointments.controller';
import {
  CreateAppointmentUseCase,
  CreateCustomerRecurringAppointmentUseCase,
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
    CreateCustomerRecurringAppointmentUseCase,
    GetNextAppointmentUseCase,
    GetCustomerAppointmentsUseCase,
    ConfirmCustomerAppointmentUseCase,
    CancelCustomerAppointmentUseCase,
    RescheduleCustomerAppointmentUseCase,
  ],
  exports: [CreateAppointmentUseCase],
})
export class CustomerAppointmentsModule {}
