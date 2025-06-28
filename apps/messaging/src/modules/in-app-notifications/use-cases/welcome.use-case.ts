import { PrismaService } from '@app/shared';
import { WelcomeMessageDto } from '@app/shared/dto/messaging/in-app-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WelcomeUseCase {
  private readonly logger = new Logger(WelcomeUseCase.name);

  constructor(private readonly prismaService: PrismaService) {}

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    routingKey: MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.WELCOME_QUEUE,
    queue: MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.WELCOME_QUEUE,
  })
  async execute({ message, professionalProfileId, title }: WelcomeMessageDto) {
    this.logger.debug(
      `Received welcome message for professional profile ID: ${professionalProfileId}`,
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
    } catch (error) {
      this.logger.error(error);
    }
  }
}
