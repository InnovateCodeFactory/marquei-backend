import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import {
  CreateAppointmentUseCase,
  GetAppointmentsUseCase,
  GetAvailableTimesUseCase,
} from './use-cases';
import { CancelAppointmentUseCase } from './use-cases/cancel-appointment.use-case';

@Module({
  controllers: [AppointmentsController],
  providers: [
    ResponseHandlerService,
    GetAvailableTimesUseCase,
    CreateAppointmentUseCase,
    GetAppointmentsUseCase,
    CancelAppointmentUseCase,
  ],
})
export class AppointmentsModule {}
