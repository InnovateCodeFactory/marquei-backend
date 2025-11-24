import { PrismaService } from '@app/shared';
import { Injectable, Logger } from '@nestjs/common';
import { RevenueCatEvent } from '../types';

@Injectable()
export class RevenueCatCancellationUseCase {
  private readonly logger = new Logger(RevenueCatCancellationUseCase.name);
  constructor(private readonly prismaService: PrismaService) {}

  async execute(event: RevenueCatEvent) {
    // Consider a short buffer to handle events that arrive slightly before/after expiration.
    const EXPIRATION_BUFFER_MINUTES = 5;
    const slug =
      (event.subscriber_attributes?.business_slug?.value as string) ??
      event.app_user_id;

    const business = await this.prismaService.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!business) {
      this.logger.error(
        `Business not found for slug "${slug}" in CANCELLATION event ${event.id}`,
      );
      return;
    }

    const subscription =
      await this.prismaService.businessSubscription.findFirst({
        where: {
          businessId: business.id,
          status: {
            in: [
              'ACTIVE',
              'TRIALING',
              'PAST_DUE',
              'INCOMPLETE',
              'INCOMPLETE_EXPIRED',
              'UNPAID',
            ],
          },
        },
      });

    if (!subscription) {
      this.logger.warn(
        `No active subscription found for business "${slug}" on CANCELLATION`,
      );
      return;
    }

    const newEndDate = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : subscription.current_period_end;

    const now = new Date();
    const bufferDate = new Date(
      now.getTime() + EXPIRATION_BUFFER_MINUTES * 60 * 1000,
    );
    const shouldExpireNow =
      !!newEndDate && newEndDate.getTime() <= bufferDate.getTime();

    // If the subscription is already expired or will expire within the buffer, immediately inactivate.
    if (shouldExpireNow) {
      await this.prismaService.businessSubscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELED',
          cancel_at_period_end: true,
          current_period_end: newEndDate,
          subscription_histories: {
            create: {
              action: 'CANCELED',
              previousPlanId: subscription.planId,
              reason:
                'RevenueCat CANCELLATION (expired or expiring immediately)',
            },
          },
        },
      });

      await this.prismaService.business.update({
        where: { id: business.id },
        data: { is_active: false },
      });

      return;
    }

    await this.prismaService.businessSubscription.update({
      where: { id: subscription.id },
      data: {
        // Mantém o status atual (ACTIVE/TRIALING/etc.), mas indica que será cancelada ao final do período.
        cancel_at_period_end: true,
        current_period_end: newEndDate,
        subscription_histories: {
          create: {
            action: 'CANCELED',
            previousPlanId: subscription.planId,
            reason: 'RevenueCat CANCELLATION (cancel_at_period_end)',
          },
        },
      },
    });
  }
}
