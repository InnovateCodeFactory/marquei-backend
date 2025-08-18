import { CustomerAuthGuard } from '@app/shared/guards/customer-auth.guard';
import { Module } from '@nestjs/common';
import { BusinessModule } from './business/business.module';
import { CustomerAppointmentsModule } from './customer-appointments/customer-appointments.module';

@Module({
  imports: [BusinessModule, CustomerAppointmentsModule],
  providers: [
    {
      provide: 'APP_CUSTOMER_GUARD',
      useClass: CustomerAuthGuard,
    },
  ],
})
export class ClientModule {}
