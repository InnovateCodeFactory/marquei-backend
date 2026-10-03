import { Module } from '@nestjs/common';
import { SetReviewEligibilityUseCase } from './app-review/use-cases';
import {
  CloseDueAppointmentsUseCase,
  SchedulePlanReminderUseCase,
  ScheduleReminderUseCase,
} from './appointments/use-cases';
import { DeactivateExpiredFreeTrialBusinessesUseCase } from './business/use-cases';
import {
  ExpireWaitlistOffersUseCase,
  OfferNextWaitlistEntryUseCase,
} from './waitlist/use-cases';

@Module({
  providers: [
    // Use cases
    CloseDueAppointmentsUseCase,
    ScheduleReminderUseCase,
    SchedulePlanReminderUseCase,
    SetReviewEligibilityUseCase,
    DeactivateExpiredFreeTrialBusinessesUseCase,
    OfferNextWaitlistEntryUseCase,
    ExpireWaitlistOffersUseCase,
  ],
  exports: [
    // Use cases
    CloseDueAppointmentsUseCase,
    ScheduleReminderUseCase,
    SchedulePlanReminderUseCase,
    SetReviewEligibilityUseCase,
    DeactivateExpiredFreeTrialBusinessesUseCase,
    OfferNextWaitlistEntryUseCase,
    ExpireWaitlistOffersUseCase,
  ],
})
export class ApplicationModule {}
