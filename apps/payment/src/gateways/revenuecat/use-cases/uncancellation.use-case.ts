import { PrismaService } from '@app/shared';
import { Injectable, Logger } from '@nestjs/common';
import { RevenueCatEvent } from '../types';

@Injectable()
export class RevenueCatUncancellationUseCase {
  private readonly logger = new Logger(RevenueCatUncancellationUseCase.name);

  constructor(private readonly prismaService: PrismaService) {}

  async execute(event: RevenueCatEvent) {
    const slug = event.app_user_id;

    const business = await this.prismaService.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!business) {
      this.logger.error(
        `Business not found for slug "${slug}" in UNCANCELLATION event ${event.id}`,
      );
      return;
    }

    const subscription =
      await this.prismaService.businessSubscription.findFirst({
        where: {
          businessId: business.id,
          status: 'CANCELED',
        },
      });

    if (!subscription) {
      this.logger.warn(
        `No canceled subscription found for business "${slug}" on UNCANCELLATION`,
      );
      return;
    }

    const periodStart = event.purchased_at_ms
      ? new Date(event.purchased_at_ms)
      : subscription.current_period_start;
    const periodEnd = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : subscription.current_period_end;

    await this.prismaService.businessSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        cancel_at_period_end: false,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        subscription_histories: {
          create: {
            action: 'UPDATED',
            previousPlanId: subscription.planId,
            newPlanId: subscription.planId,
            reason: 'RevenueCat UNCANCELLATION',
          },
        },
      },
    });

    await this.prismaService.business.update({
      where: { id: business.id },
      data: { is_active: true },
    });
  }
}
