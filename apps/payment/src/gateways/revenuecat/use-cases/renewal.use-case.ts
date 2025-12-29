import { PrismaService } from '@app/shared';
import { Injectable, Logger } from '@nestjs/common';
import { RevenueCatEvent } from '../types';

@Injectable()
export class RevenueCatRenewalUseCase {
  private readonly logger = new Logger(RevenueCatRenewalUseCase.name);

  constructor(private readonly prismaService: PrismaService) {}

  async execute(event: RevenueCatEvent) {
    const slug = event.app_user_id;

    const business = await this.prismaService.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!business) {
      this.logger.error(
        `Business not found for slug "${slug}" in RENEWAL event ${event.id}`,
      );
      return;
    }

    const plan = await this.prismaService.plan.findUnique({
      where: { plan_id: event.product_id },
    });

    if (!plan) {
      this.logger.error(
        `Plan not found for product_id "${event.product_id}" in RENEWAL event ${event.id}`,
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
        `No existing subscription found for business "${slug}" on RENEWAL; creating one.`,
      );
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

    if (!subscription) {
      await this.prismaService.businessSubscription.create({
        data: {
          business: { connect: { id: business.id } },
          plan: { connect: { id: plan.id } },
          status: 'ACTIVE',
          cancel_at_period_end: false,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          Payment: paymentData,
          subscription_histories: {
            create: {
              action: 'RENEWED',
              newPlanId: plan.id,
              reason: 'RevenueCat RENEWAL (no existing subscription)',
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

    const changedPlan = subscription.planId !== plan.id;

    await this.prismaService.businessSubscription.update({
      where: { id: subscription.id },
      data: {
        plan: changedPlan ? { connect: { id: plan.id } } : undefined,
        status: 'ACTIVE',
        cancel_at_period_end: false,
        current_period_start: periodStart ?? subscription.current_period_start,
        current_period_end: periodEnd ?? subscription.current_period_end,
        Payment: paymentData,
        subscription_histories: {
          create: {
            action: 'RENEWED',
            previousPlanId: changedPlan ? subscription.planId : undefined,
            newPlanId: changedPlan ? plan.id : undefined,
            reason: 'RevenueCat RENEWAL',
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
