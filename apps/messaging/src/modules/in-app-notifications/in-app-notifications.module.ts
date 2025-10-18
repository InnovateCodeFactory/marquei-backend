import { Module } from '@nestjs/common';
import { NewAppointmentNotificationUseCase, WelcomeUseCase } from './use-cases';

@Module({
  providers: [WelcomeUseCase, NewAppointmentNotificationUseCase],
})
export class InAppNotificationsModule {}
