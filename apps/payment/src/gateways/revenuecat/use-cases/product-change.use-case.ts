import { PrismaService } from '@app/shared';
import { Injectable, Logger } from '@nestjs/common';
import { RevenueCatEvent } from '../types';

@Injectable()
export class RevenueCatHandleProductChangeUseCase {
  private readonly logger = new Logger(
    RevenueCatHandleProductChangeUseCase.name,
  );

  constructor(private readonly prismaService: PrismaService) {}

  async execute(event: RevenueCatEvent) {
    const slug =
      (event.subscriber_attributes?.business_slug?.value as string) ??
      event.app_user_id;

    const business = await this.prismaService.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!business) {
      this.logger.error(
        `Business not found for slug "${slug}" in PRODUCT_CHANGE event ${event.id}`,
      );
      return;
    }

    const previousPlan = await this.prismaService.plan.findUnique({
      where: { plan_id: event.product_id },
    });

    const newProductId = event.new_product_id;
    if (!newProductId) {
      this.logger.error(
        `PRODUCT_CHANGE event ${event.id} missing new_product_id`,
      );
      return;
    }

    const newPlan = await this.prismaService.plan.findUnique({
      where: { plan_id: newProductId },
    });

    if (!newPlan) {
      this.logger.error(
        `New plan not found for new_product_id "${newProductId}" in PRODUCT_CHANGE event ${event.id}`,
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

    if (!subscription) {
      await this.prismaService.businessSubscription.create({
        data: {
          business: { connect: { id: business.id } },
          plan: { connect: { id: newPlan.id } },
          status: event.period_type === 'TRIAL' ? 'TRIALING' : 'ACTIVE',
          cancel_at_period_end: false,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          Payment: paymentData,
          subscription_histories: {
            create: {
              action: 'CREATED',
              previousPlanId: previousPlan?.id,
              newPlanId: newPlan.id,
              reason: 'RevenueCat PRODUCT_CHANGE (no existing subscription)',
            },
          },
        },
      });

      await this.prismaService.business.update({
        where: { id: business.id },
        data: { is_active: true },
      });

      return;
    }

    await this.prismaService.businessSubscription.update({
      where: { id: subscription.id },
      data: {
        plan: { connect: { id: newPlan.id } },
        status: event.period_type === 'TRIAL' ? 'TRIALING' : 'ACTIVE',
        cancel_at_period_end: false,
        current_period_start: periodStart ?? subscription.current_period_start,
        current_period_end: periodEnd ?? subscription.current_period_end,
        Payment: paymentData,
        subscription_histories: {
          create: {
            action: 'UPDATED',
            previousPlanId: subscription.planId,
            newPlanId: newPlan.id,
            reason: 'RevenueCat PRODUCT_CHANGE',
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
