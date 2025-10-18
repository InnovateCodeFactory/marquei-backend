import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BusinessRatingModule } from './business-rating/business-rating.module';
import { BusinessModule } from './business/business.module';
import { CustomerAppointmentsModule } from './customer-appointments/customer-appointments.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ProfileModule } from './profile/profile.module';
import { FavoritesModule } from './favorites/favorites.module';
import { InAppNotificationsModule } from './in-app-notifications/in-app-notifications.module';

@Module({
  imports: [
    BusinessModule,
    CustomerAppointmentsModule,
    AuthModule,
    ProfileModule,
    BusinessRatingModule,
    OnboardingModule,
    FavoritesModule,
    InAppNotificationsModule,
  ],
})
export class ClientModule {}
