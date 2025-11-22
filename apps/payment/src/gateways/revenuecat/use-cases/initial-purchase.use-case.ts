import { PrismaService } from '@app/shared';
import { Injectable, Logger } from '@nestjs/common';
import { RevenueCatEvent } from '../types';

@Injectable()
export class RevenueCatInitialPurchaseUseCase {
  private readonly logger = new Logger(
    RevenueCatInitialPurchaseUseCase.name,
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
        `Business not found for slug "${slug}" in INITIAL_PURCHASE event ${event.id}`,
      );
      return;
    }

    const plan = await this.prismaService.plan.findUnique({
      where: { plan_id: event.product_id },
    });

    if (!plan) {
      this.logger.error(
        `Plan not found for product_id "${event.product_id}" in INITIAL_PURCHASE event ${event.id}`,
      );
      return;
    }

    const existingSub =
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

    if (!existingSub) {
      await this.prismaService.businessSubscription.create({
        data: {
          business: { connect: { id: business.id } },
          plan: { connect: { id: plan.id } },
          status: event.period_type === 'TRIAL' ? 'TRIALING' : 'ACTIVE',
          cancel_at_period_end: false,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          Payment: paymentData,
          subscription_histories: {
            create: {
              action: 'CREATED',
              newPlanId: plan.id,
              reason: 'RevenueCat INITIAL_PURCHASE',
            },
          },
        },
      });

      this.logger.debug(
        `Created new subscription for business "${slug}" with plan "${plan.plan_id}" from INITIAL_PURCHASE`,
      );
      return;
    }

    // Atualiza assinatura existente (ex.: havia plano anterior local)
    await this.prismaService.businessSubscription.update({
      where: { id: existingSub.id },
      data: {
        plan: { connect: { id: plan.id } },
        status: event.period_type === 'TRIAL' ? 'TRIALING' : 'ACTIVE',
        cancel_at_period_end: false,
        current_period_start: periodStart ?? existingSub.current_period_start,
        current_period_end: periodEnd ?? existingSub.current_period_end,
        Payment: paymentData,
        subscription_histories: {
          create: {
            action: 'UPDATED',
            previousPlanId: existingSub.planId,
            newPlanId: plan.id,
            reason: 'RevenueCat INITIAL_PURCHASE (update existing)',
          },
        },
      },
    });

    this.logger.debug(
      `Updated existing subscription for business "${slug}" with plan "${plan.plan_id}" from INITIAL_PURCHASE`,
    );
  }
}

