import { Module } from '@nestjs/common';
import { CustomerAppointmentsController } from './customer-appointments.controller';
import { CreateAppointmentUseCase } from './use-cases';

@Module({
  controllers: [CustomerAppointmentsController],
  providers: [CreateAppointmentUseCase],
})
export class CustomerAppointmentsModule {}
