import { Module } from '@nestjs/common';
import { PushNotificationsBaseService } from './push-notifications-base.service';
import {
  SendBulkMockNotificationUseCase,
  SendNotificationUseCase,
  SendTestNotificationUseCase,
} from './use-cases';

@Module({
  providers: [
    PushNotificationsBaseService,
    SendBulkMockNotificationUseCase,
    SendTestNotificationUseCase,
    SendNotificationUseCase,
  ],
})
export class PushNotificationsModule {}
