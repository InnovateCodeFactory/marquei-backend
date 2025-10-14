import { PrismaService } from '@app/shared';
import { PAYMENT_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_PAYMENT_GATEWAY } from '../stripe.constants';

@Injectable()
export class UpgradeSubscriptionUseCase {
  private readonly logger = new Logger(UpgradeSubscriptionUseCase.name);

  constructor(
    @Inject(STRIPE_PAYMENT_GATEWAY)
    private readonly stripe: Stripe,
    private readonly prisma: PrismaService,
  ) {}

  @RabbitRPC({
    exchange: RABBIT_EXCHANGE,
    queue: PAYMENT_QUEUES.USE_CASES.UPGRADE_STRIPE_SUBSCRIPTION_QUEUE,
    routingKey: PAYMENT_QUEUES.USE_CASES.UPGRADE_STRIPE_SUBSCRIPTION_QUEUE,
  })
  async execute(body: {
    stripe_customer_id: string;
    price_id: string;
    proration?: 'create_prorations' | 'none';
    reset_cycle_now?: boolean;
  }) {
    const {
      stripe_customer_id,
      price_id,
      proration = 'create_prorations',
      reset_cycle_now = true,
    } = body;

    try {
      if (!stripe_customer_id || !price_id) {
        throw new Error('stripe_customer_id and price_id are required');
      }

      // Find an active Stripe subscription for this customer
      const activeSub =
        await this.findActiveStripeSubscription(stripe_customer_id);

      if (!activeSub) {
        this.logger.warn(
          `No active Stripe subscription found for customer ${stripe_customer_id}. Nothing to upgrade.`,
        );
        return { updated: false };
      }

      const currentItem = activeSub.items.data[0];
      if (!currentItem) {
        throw new Error('Active subscription found without items');
      }

      const updated = await this.stripe.subscriptions.update(activeSub.id, {
        items: [
          {
            id: currentItem.id,
            price: price_id,
          },
        ],
        proration_behavior: proration,
        billing_cycle_anchor: reset_cycle_now ? 'now' : 'unchanged',
        payment_behavior: 'pending_if_incomplete',
      });

      this.logger.debug(
        `Upgraded subscription ${activeSub.id} to price ${price_id}`,
      );

      // DB will be updated by invoice.payment_succeeded webhook on proration/subscription_update
      return { updated: true, subscription_id: updated.id };
    } catch (error) {
      this.logger.error('Error upgrading subscription', error);
      return { updated: false };
    }
  }

  private async findActiveStripeSubscription(customerId: string) {
    const subs = await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      expand: ['data.items'],
      limit: 3,
    });
    return subs.data[0] ?? null;
  }
}
