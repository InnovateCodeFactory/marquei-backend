import { Module } from '@nestjs/common';
import { CustomerAppointmentsController } from './customer-appointments.controller';
import {
  CreateAppointmentUseCase,
  GetNextAppointmentUseCase,
} from './use-cases';

@Module({
  controllers: [CustomerAppointmentsController],
  providers: [CreateAppointmentUseCase, GetNextAppointmentUseCase],
})
export class CustomerAppointmentsModule {}
