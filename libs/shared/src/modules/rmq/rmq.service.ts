import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';

export const RABBIT_EXCHANGE = 'amqp.direct';

@Injectable()
export class RmqService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  public async publishToQueue({
    payload,
    routingKey,
  }: {
    routingKey: string;
    payload: unknown;
  }): Promise<void> {
    try {
      await this.amqpConnection.publish(RABBIT_EXCHANGE, routingKey, payload);
    } catch (error) {
      console.error(`Error publishing message to ${routingKey}:`, error);
    }
  }

  public async requestFromQueue<T>({
    payload,
    routingKey,
  }: {
    routingKey: string;
    payload: unknown;
  }): Promise<T> {
    try {
      return await this.amqpConnection.request({
        exchange: RABBIT_EXCHANGE,
        routingKey,
        payload,
      });
    } catch (error) {
      console.error(`Error publishing message to ${routingKey}:`, error);
    }
  }
}
