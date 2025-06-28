import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BusinessCategoryModule } from './business-category/business-category.module';
import { BusinessServiceTypeModule } from './business-service-type/business-service-type.module';
import { BusinessModule } from './business/business.module';
import { CustomersModule } from './customers/customers.module';
import { ServicesModule } from './services/services.module';
import { PlansModule } from './plans/plans.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { InAppNotificationsModule } from './in-app-notifications/in-app-notifications.module';

@Module({
  imports: [
    AuthModule,
    BusinessServiceTypeModule,
    BusinessCategoryModule,
    BusinessModule,
    CustomersModule,
    ServicesModule,
    PlansModule,
    AppointmentsModule,
    ProfessionalsModule,
    InAppNotificationsModule,
  ],
})
export class ProfessionalModule {}
