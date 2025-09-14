import { PrismaService } from '@app/shared';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';

export const LOGGING_QUEUE = 'logging_queue';

@Injectable()
export class LoggingHandlerQueue {
  private readonly logger = new Logger(LoggingHandlerQueue.name);
  constructor(private readonly prismaService: PrismaService) {}

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    queue: LOGGING_QUEUE,
    routingKey: LOGGING_QUEUE,
  })
  public async handleLogMessage(msg: any) {
    try {
      await this.prismaService.logs.create({
        data: msg,
      });
    } catch (error) {
      this.logger.error(error);
    }
  }
}
