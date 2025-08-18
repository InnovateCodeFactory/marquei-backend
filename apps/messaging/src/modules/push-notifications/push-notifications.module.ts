import { Module } from '@nestjs/common';
import { PushNotificationsBaseService } from './push-notifications-base.service';
import {
  SendNotificationUseCase,
  SendTestNotificationUseCase,
} from './use-cases';

@Module({
  providers: [
    PushNotificationsBaseService,
    SendTestNotificationUseCase,
    SendNotificationUseCase,
  ],
})
export class PushNotificationsModule {}
