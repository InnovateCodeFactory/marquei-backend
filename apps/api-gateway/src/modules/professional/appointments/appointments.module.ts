import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import {
  CreateAppointmentUseCase,
  GetAppointmentsUseCase,
  GetAvailableTimesUseCase,
} from './use-cases';

@Module({
  controllers: [AppointmentsController],
  providers: [
    ResponseHandlerService,
    GetAvailableTimesUseCase,
    CreateAppointmentUseCase,
    GetAppointmentsUseCase,
  ],
})
export class AppointmentsModule {}
