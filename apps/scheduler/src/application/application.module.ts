import { Module } from '@nestjs/common';
import { SetReviewEligibilityUseCase } from './app-review/use-cases';
import {
  CloseDueAppointmentsUseCase,
  ScheduleReminderUseCase,
} from './appointments/use-cases';
import { DeactivateExpiredFreeTrialBusinessesUseCase } from './business/use-cases';

@Module({
  providers: [
    // Use cases
    CloseDueAppointmentsUseCase,
    ScheduleReminderUseCase,
    SetReviewEligibilityUseCase,
    DeactivateExpiredFreeTrialBusinessesUseCase,
  ],
  exports: [
    // Use cases
    CloseDueAppointmentsUseCase,
    ScheduleReminderUseCase,
    SetReviewEligibilityUseCase,
    DeactivateExpiredFreeTrialBusinessesUseCase,
  ],
})
export class ApplicationModule {}
