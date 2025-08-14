import { Module } from '@nestjs/common';
import { PushNotificationsBaseService } from './push-notifications-base.service';
import { SendTestNotificationUseCase } from './use-cases';

@Module({
  providers: [PushNotificationsBaseService, SendTestNotificationUseCase],
})
export class PushNotificationsModule {}
