import { SharedModule } from '@app/shared';
import { Module } from '@nestjs/common';
import { InAppNotificationsModule } from './modules/in-app-notifications/in-app-notifications.module';

@Module({
  imports: [SharedModule, InAppNotificationsModule],
})
export class MessagingModule {}
