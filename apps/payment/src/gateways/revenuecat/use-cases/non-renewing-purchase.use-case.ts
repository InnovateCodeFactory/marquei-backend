import { PrismaService } from '@app/shared';
import { Injectable, Logger } from '@nestjs/common';
import { RevenueCatEvent } from '../types';

@Injectable()
export class RevenueCatNonRenewingPurchaseUseCase {
  private readonly logger = new Logger(
    RevenueCatNonRenewingPurchaseUseCase.name,
  );

  constructor(private readonly prismaService: PrismaService) {}

  async execute(event: RevenueCatEvent) {
    const slug = event.app_user_id;

    const business = await this.prismaService.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!business) {
      this.logger.error(
        `Business not found for slug "${slug}" in NON_RENEWING_PURCHASE event ${event.id}`,
      );
      return;
    }

    const plan = await this.prismaService.plan.findUnique({
      where: { plan_id: event.product_id },
    });

    if (!plan) {
      this.logger.error(
        `Plan not found for product_id "${event.product_id}" in NON_RENEWING_PURCHASE event ${event.id}`,
      );
      return;
    }

    const periodStart = event.purchased_at_ms
      ? new Date(event.purchased_at_ms)
      : undefined;
    const periodEnd = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : undefined;

    const amountInCents = Math.round(
      (event.price_in_purchased_currency || event.price || 0) * 100,
    );

    const paymentData =
      amountInCents > 0
        ? {
            create: {
              amount_paid_in_cents: amountInCents,
              currency: event.currency,
              paid_at: new Date(event.event_timestamp_ms),
              status: 'PAID' as const,
            },
          }
        : undefined;

    await this.prismaService.businessSubscription.create({
      data: {
        business: { connect: { id: business.id } },
        plan: { connect: { id: plan.id } },
        status: 'ACTIVE',
        cancel_at_period_end: true, // não renova automaticamente
        current_period_start: periodStart,
        current_period_end: periodEnd,
        Payment: paymentData,
        subscription_histories: {
          create: {
            action: 'CREATED',
            newPlanId: plan.id,
            reason: 'RevenueCat NON_RENEWING_PURCHASE',
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
