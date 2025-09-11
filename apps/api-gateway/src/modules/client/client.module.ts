import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { CustomerAppointmentsModule } from './customer-appointments/customer-appointments.module';
import { ProfileModule } from './profile/profile.module';
import { BusinessRatingModule } from './business-rating/business-rating.module';

@Module({
  imports: [BusinessModule, CustomerAppointmentsModule, AuthModule, ProfileModule, BusinessRatingModule],
})
export class ClientModule {}
