import { CustomerAuthGuard } from '@app/shared/guards/customer-auth.guard';
import { Module } from '@nestjs/common';
import { BusinessModule } from './business/business.module';
import { CustomerAppointmentsModule } from './customer-appointments/customer-appointments.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [BusinessModule, CustomerAppointmentsModule, AuthModule],
  providers: [
    {
      provide: 'APP_CUSTOMER_GUARD',
      useClass: CustomerAuthGuard,
    },
  ],
})
export class ClientModule {}
