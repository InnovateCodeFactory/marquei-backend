import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PushNotificationsBaseService } from '../push-notifications-base.service';

@Injectable()
export class SendTestNotificationUseCase implements OnApplicationBootstrap {
  constructor(
    private readonly pushNotificationsBaseService: PushNotificationsBaseService,
  ) {}

  async onApplicationBootstrap() {
    // await this.execute();
  }

  async execute() {
    await this.pushNotificationsBaseService.sendToMultipleTokens({
      common: {
        title: 'Test Notification From Server',
        body: 'This is a test notification sent from the server.',
      },
      tokens: [
        'ExponentPushToken[Rek050JXlxEjgGiQ3aRFqq]',
        'ExponentPushToken[bHaYQgI5l15sUCFDMeaOHX]',
      ],
      options: {
        verbose: true,
      },
    });
  }
}
