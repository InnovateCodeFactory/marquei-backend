import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { CustomerAppointmentsModule } from './customer-appointments/customer-appointments.module';

@Module({
  imports: [BusinessModule, CustomerAppointmentsModule, AuthModule],
})
export class ClientModule {}
