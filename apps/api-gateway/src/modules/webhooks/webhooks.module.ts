import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, ResponseHandlerService],
})
export class WebhooksModule {}
