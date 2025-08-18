import { SendPushNotificationDto } from '@app/shared/dto/messaging/push-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { PushNotificationsBaseService } from '../push-notifications-base.service';

@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger(SendNotificationUseCase.name);

  constructor(
    private readonly pushNotificationsBaseService: PushNotificationsBaseService,
  ) {}

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    routingKey: MESSAGING_QUEUES.PUSH_NOTIFICATIONS.APPOINTMENT_CREATED_QUEUE,
    queue: MESSAGING_QUEUES.PUSH_NOTIFICATIONS.APPOINTMENT_CREATED_QUEUE,
  })
  async execute(payload: SendPushNotificationDto) {
    try {
      await this.pushNotificationsBaseService.sendPushNotification({
        input: {
          to: payload.pushTokens,
          title: payload.title,
          body: payload.body,
        },
        options: {
          verbose: true,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error sending push notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
