import { PrismaService } from '@app/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_PAYMENT_GATEWAY } from '../../stripe.constants';

type Plan = {
  id: string;
  created_at: Date;
  updated_at: Date;
  name: string;
  description: string | null;
  is_active: boolean;
  stripePriceId: string;
  stripeProductId: string;
  price_in_cents: number;
  billing_period: string;
};

type Payment = {
  id: string;
  status: string;
  created_at: Date;
  stripeInvoiceId: string;
  amount_paid_in_cents: number;
  currency: string;
  paid_at: Date;
  businessSubscriptionId: string;
};

@Injectable()
export class InvoicePaymentSucceeded {
  private readonly logger = new Logger(InvoicePaymentSucceeded.name);

  constructor(
    @Inject(STRIPE_PAYMENT_GATEWAY)
    private readonly stripe: Stripe,
    private readonly prisma: PrismaService,
  ) {}

  async handlePaymentSuccess(
    event: Stripe.Event & { data: { object: Stripe.Invoice } },
  ) {
    const invoice = await this.stripe.invoices.retrieve(event.data.object.id, {
      expand: ['subscription', 'lines.data.price'],
    });

    const billingReason = invoice.billing_reason;
    const businessId = invoice.customer as string;
    const stripeInvoiceId = invoice.id;

    const plan = await this.getPlanFromInvoice(invoice);
    const businessSubscription = await this.findActiveSubscription(businessId);

    const commonData = this.mapInvoiceToPayment(invoice, stripeInvoiceId);

    await this.createWebhookLog(event);

    switch (billingReason) {
      case 'subscription_create':
        return this.handleSubscriptionCreate(
          businessId,
          businessSubscription,
          plan,
          invoice,
          commonData,
        );

      case 'subscription_cycle':
      case 'subscription_threshold':
      case 'subscription_update':
        return this.handleSubscriptionUpdate(
          businessSubscription,
          plan,
          invoice,
          commonData,
        );

      case 'manual':
        return this.handleManualInvoice(invoice);

      default:
        this.logger.warn(`Unhandled billing reason: ${billingReason}`);
        return;
    }
  }

  private async handleSubscriptionCreate(
    businessId: string,
    businessSubscription: any,
    plan: Plan,
    invoice: Stripe.Invoice,
    commonData: Partial<Payment> | any,
  ) {
    if (businessSubscription) return;

    await this.prisma.businessSubscription.create({
      data: {
        business: { connect: { id: businessId } },
        plan: { connect: { id: plan.id } },
        stripeCustomerId: businessId,
        status: 'ACTIVE',
        current_period_start: new Date(invoice.period_start * 1000),
        current_period_end: new Date(invoice.period_end * 1000),
        Payment: { create: commonData },
        subscription_histories: {
          create: {
            action: 'CREATED',
            newPlanId: plan.id,
          },
        },
      },
    });
  }

  private async handleSubscriptionUpdate(
    businessSubscription: any,
    plan: Plan,
    invoice: Stripe.Invoice,
    commonData: Partial<Payment>,
  ) {
    if (!businessSubscription) return;

    const updates: any = {
      current_period_start: new Date(invoice.period_start * 1000),
      current_period_end: new Date(invoice.period_end * 1000),
      Payment: { create: commonData },
    };

    const historyData = {
      action: 'RENEWED',
      previousPlanId:
        businessSubscription.planId !== plan.id
          ? businessSubscription.planId
          : undefined,
      newPlanId: businessSubscription.planId !== plan.id ? plan.id : undefined,
    };

    if (historyData.previousPlanId) {
      updates.plan = { connect: { id: plan.id } };
    }

    await this.prisma.businessSubscription.update({
      where: { id: businessSubscription.id },
      data: {
        ...updates,
        subscription_histories: { create: historyData },
      },
    });
  }

  private async handleManualInvoice(invoice: Stripe.Invoice) {
    this.logger.log(`Manual invoice received. Invoice ID: ${invoice.id}`);
    // Pode salvar em outra tabela ou emitir notificação
  }

  private mapInvoiceToPayment(
    invoice: Stripe.Invoice,
    stripeInvoiceId: string,
  ): Partial<Payment> {
    return {
      amount_paid_in_cents: invoice.amount_paid,
      currency: invoice.currency,
      paid_at: new Date(invoice.status_transitions.paid_at * 1000),
      stripeInvoiceId,
      status: 'PAID',
    };
  }

  private async findActiveSubscription(businessId: string) {
    return this.prisma.businessSubscription.findFirst({
      where: {
        businessId,
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
      },
    });
  }

  private async getPlanFromInvoice(invoice: Stripe.Invoice) {
    const priceId = invoice.lines.data?.[0]?.pricing?.price_details?.price;

    const plan = await this.prisma.plan.findUnique({
      where: { stripePriceId: priceId },
    });

    if (!plan) throw new Error(`Plano não encontrado para priceId: ${priceId}`);
    return plan;
  }

  private async createWebhookLog(event: Stripe.Event) {
    await this.prisma.webhookEvent.create({
      data: {
        event_id: event.id,
        type: event.type,
        payload: event as any,
      },
    });
  }
}
