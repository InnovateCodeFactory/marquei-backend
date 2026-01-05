import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { RevenueCatWebhookGuard } from './revenuecat-webhook.guard';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, ResponseHandlerService, RevenueCatWebhookGuard],
})
export class WebhooksModule {}
