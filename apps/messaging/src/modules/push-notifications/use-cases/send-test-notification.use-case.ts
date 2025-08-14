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
    await this.pushNotificationsBaseService.sendToSingleToken({
      token: 'test-token',
      common: {
        title: 'Test Notification',
        body: 'This is a test notification',
      },
      options: {
        verbose: true,
        fetchReceipts: true,
      },
    });
  }
}
