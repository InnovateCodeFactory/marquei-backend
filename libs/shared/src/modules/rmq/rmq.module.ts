import { EnvSchemaType } from '@app/shared/environment';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqService } from './rmq.service';

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvSchemaType>) => {
        const rabbitmqHost = configService.getOrThrow('RABBITMQ_HOST');
        const rabbitmqPort = configService.getOrThrow('RABBITMQ_PORT');
        const rabbitmqUser = configService.getOrThrow('RABBITMQ_USER');
        const rabbitmqPass = configService.getOrThrow('RABBITMQ_PASS');

        return {
          exchanges: [
            {
              name: 'amqp.direct',
              type: 'topic',
            },
          ],
          uri: `amqp://${rabbitmqUser}:${rabbitmqPass}@${rabbitmqHost}:${rabbitmqPort}`,
          channels: {
            'channel-1': {
              prefetchCount: 1,
              default: true,
            },
          },
        };
      },
    }),
  ],
  providers: [RmqService],
  exports: [RmqService],
})
export class RmqModule {}
