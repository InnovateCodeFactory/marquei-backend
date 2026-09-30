import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BusinessRatingModule } from './business-rating/business-rating.module';
import { BusinessModule } from './business/business.module';
import { CustomerAppointmentsModule } from './customer-appointments/customer-appointments.module';
import { CustomerPlansModule } from './customer-plans/customer-plans.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ProfileModule } from './profile/profile.module';
import { FavoritesModule } from './favorites/favorites.module';
import { InAppNotificationsModule } from './in-app-notifications/in-app-notifications.module';
import { WaitlistModule } from './waitlist/waitlist.module';

@Module({
  imports: [
    BusinessModule,
    CustomerAppointmentsModule,
    CustomerPlansModule,
    AuthModule,
    ProfileModule,
    BusinessRatingModule,
    OnboardingModule,
    FavoritesModule,
    InAppNotificationsModule,
    WaitlistModule,
  ],
})
export class ClientModule {}
