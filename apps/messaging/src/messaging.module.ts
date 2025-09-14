import { LibsSharedModule } from '@app/shared';
import { Module } from '@nestjs/common';
import { InAppNotificationsModule } from './modules/in-app-notifications/in-app-notifications.module';
import { MailsModule } from './modules/mails/mails.modute';
import { PushNotificationsModule } from './modules/push-notifications/push-notifications.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    LibsSharedModule,
    InAppNotificationsModule,
    PushNotificationsModule,
    MailsModule,
    WhatsappModule,
  ],
})
export class MessagingModule {}
