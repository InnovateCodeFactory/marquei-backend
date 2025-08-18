import { AuthGuard } from '@app/shared/guards/auth.guard';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { BusinessCategoryModule } from './business-category/business-category.module';
import { BusinessServiceTypeModule } from './business-service-type/business-service-type.module';
import { BusinessModule } from './business/business.module';
import { CustomersModule } from './customers/customers.module';
import { InAppNotificationsModule } from './in-app-notifications/in-app-notifications.module';
import { PlansModule } from './plans/plans.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ServicesModule } from './services/services.module';
import { StatementModule } from './statement/statement.module';

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
    StatementModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class ProfessionalModule {}
