import { SharedModule } from '@app/shared';
import { Module } from '@nestjs/common';
import { InAppNotificationsModule } from './modules/in-app-notifications/in-app-notifications.module';
import { MailsModule } from './modules/mails/mails.modute';
import { PushNotificationsModule } from './modules/push-notifications/push-notifications.module';

@Module({
  imports: [
    SharedModule,
    InAppNotificationsModule,
    PushNotificationsModule,
    MailsModule,
  ],
})
export class MessagingModule {}
