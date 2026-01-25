import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import {
  CreateAppointmentUseCase,
  GetAppointmentsUseCase,
  GetAvailableTimesUseCase,
} from './use-cases';
import { BlockTimesUseCase } from './use-cases/block-times.use-case';
import { CancelAppointmentUseCase } from './use-cases/cancel-appointment.use-case';
import { DeleteBlockedTimeUseCase } from './use-cases/delete-blocked-time.use-case';
import { ListBlockedTimesUseCase } from './use-cases/get-blocked-times.use-case';
import { RescheduleAppointmentUseCase } from './use-cases/reschedule-appointment.use-case';

@Module({
  controllers: [AppointmentsController],
  providers: [
    ResponseHandlerService,
    GetAvailableTimesUseCase,
    CreateAppointmentUseCase,
    GetAppointmentsUseCase,
    CancelAppointmentUseCase,
    RescheduleAppointmentUseCase,
    BlockTimesUseCase,
    ListBlockedTimesUseCase,
    DeleteBlockedTimeUseCase,
  ],
})
export class AppointmentsModule {}
