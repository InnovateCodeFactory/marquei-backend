import { PrismaService } from '@app/shared';
import { SendInAppNotificationDto } from '@app/shared/dto/messaging/in-app-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SendInAppNotificationUseCase {
  private readonly logger = new Logger(SendInAppNotificationUseCase.name);

  constructor(private readonly prismaService: PrismaService) {}

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    routingKey: MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
    queue: MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
  })
  async execute({ title, message, professionalProfileId }: SendInAppNotificationDto) {
    this.logger.debug(
      `Received in-app notification for professional profile ID: ${professionalProfileId}`,
    );

    try {
      await this.prismaService.inAppNotification.create({
        data: {
          title,
          message,
          professional_profile: {
            connect: {
              id: professionalProfileId,
            },
          },
        },
      });

      this.logger.debug(
        `In-app notification created successfully for professional profile ID: ${professionalProfileId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create in-app notification for professional profile ID: ${professionalProfileId}`,
        (error as any)?.stack || error,
      );
    }
  }
}

