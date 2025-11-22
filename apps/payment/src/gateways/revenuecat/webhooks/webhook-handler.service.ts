import { PAYMENT_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { RevenueCatEvent, RevenueCatEventPayload } from '../types';
import {
  RevenueCatCancellationUseCase,
  RevenueCatHandleProductChangeUseCase,
  RevenueCatInitialPurchaseUseCase,
  RevenueCatNonRenewingPurchaseUseCase,
  RevenueCatRenewalUseCase,
  RevenueCatUncancellationUseCase,
} from '../use-cases';

@Injectable()
export class RevenueCatWebhookHandlerService {
  private readonly logger = new Logger(RevenueCatWebhookHandlerService.name);
  constructor(
    private readonly productChangeUseCase: RevenueCatHandleProductChangeUseCase,
    private readonly cancellationUseCase: RevenueCatCancellationUseCase,
    private readonly initialPurchaseUseCase: RevenueCatInitialPurchaseUseCase,
    private readonly renewalUseCase: RevenueCatRenewalUseCase,
    private readonly uncancellationUseCase: RevenueCatUncancellationUseCase,
    private readonly nonRenewingPurchaseUseCase: RevenueCatNonRenewingPurchaseUseCase,
  ) {}

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    routingKey: PAYMENT_QUEUES.WEBHOOKS.REVENUE_CAT_WEBHOOK_HANDLER_QUEUE,
    queue: PAYMENT_QUEUES.WEBHOOKS.REVENUE_CAT_WEBHOOK_HANDLER_QUEUE,
  })
  async handleRevenueCatWebhook(payload: RevenueCatEventPayload) {
    try {
      const event: RevenueCatEvent = payload.event;

      const eventMapper: Record<
        RevenueCatEvent['type'],
        (event: RevenueCatEvent) => Promise<void> | void
      > = {
        PRODUCT_CHANGE: (e) => this.productChangeUseCase.execute(e),
        CANCELLATION: (e) => this.cancellationUseCase.execute(e),
        INITIAL_PURCHASE: (e) => this.initialPurchaseUseCase.execute(e),
        RENEWAL: (e) => this.renewalUseCase.execute(e),
        UNCANCELLATION: (e) => this.uncancellationUseCase.execute(e),
        NON_RENEWING_PURCHASE: (e) =>
          this.nonRenewingPurchaseUseCase.execute(e),
      };

      const handler = eventMapper[event.type];
      if (handler) {
        this.logger.debug(
          `Handling RevenueCat webhook event of type ${event.type}`,
        );
        await handler(event);
      }
    } catch (error) {
      this.logger.error('Error handling RevenueCat webhook', error);
    }
  }
}
