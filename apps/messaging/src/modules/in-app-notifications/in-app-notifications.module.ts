import { Module } from '@nestjs/common';
import { SendInAppNotificationUseCase } from './use-cases';

@Module({
  providers: [SendInAppNotificationUseCase],
})
export class InAppNotificationsModule {}
