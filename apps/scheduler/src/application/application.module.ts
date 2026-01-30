import { Module } from '@nestjs/common';
import { SetReviewEligibilityUseCase } from './app-review/use-cases';
import {
  CloseDueAppointmentsUseCase,
  ScheduleReminderUseCase,
} from './appointments/use-cases';

@Module({
  providers: [
    // Use cases
    CloseDueAppointmentsUseCase,
    ScheduleReminderUseCase,
    SetReviewEligibilityUseCase,
  ],
  exports: [
    // Use cases
    CloseDueAppointmentsUseCase,
    ScheduleReminderUseCase,
    SetReviewEligibilityUseCase,
  ],
})
export class ApplicationModule {}
