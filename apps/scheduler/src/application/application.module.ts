import { Module } from '@nestjs/common';
import {
  CloseDueAppointmentsUseCase,
  ScheduleReminderUseCase,
} from './appointments/use-cases';

@Module({
  providers: [
    // Use cases
    CloseDueAppointmentsUseCase,
    ScheduleReminderUseCase,
  ],
  exports: [
    // Use cases
    CloseDueAppointmentsUseCase,
    ScheduleReminderUseCase,
  ],
})
export class ApplicationModule {}
