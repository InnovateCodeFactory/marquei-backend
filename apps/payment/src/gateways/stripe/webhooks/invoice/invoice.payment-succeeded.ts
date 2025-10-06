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

type PaymentCreate = {
  stripeInvoiceId: string;
  amount_paid_in_cents: number;
  currency: string;
  paid_at: Date;
  status: 'PAID' | 'FAILED' | 'PENDING';
};

@Injectable()
export class InvoicePaymentSucceeded {
  private readonly logger = new Logger(InvoicePaymentSucceeded.name);

  constructor(
    @Inject(STRIPE_PAYMENT_GATEWAY) private readonly stripe: Stripe,
    private readonly prisma: PrismaService,
  ) {}

  async handlePaymentSuccess(
    event: Stripe.Event & { data: { object: Stripe.Invoice } },
  ) {
    // Idempotência
    const invoiceId = event.data.object.id;
    const existing = await this.prisma.payment.findUnique({
      where: { stripeInvoiceId: invoiceId },
      select: { id: true },
    });
    if (existing) {
      this.logger.debug(`Invoice ${invoiceId} já processada; ignorando`);
      return;
    }

    await this.createWebhookLog(event);

    // Recarregue com expand nos prices da linha
    const invoice = await this.stripe.invoices.retrieve(invoiceId, {
      expand: ['lines.data.price'],
    });

    const billingReason = invoice.billing_reason;
    const stripeCustomerId = invoice.customer as string;

    const plan = await this.getPlanFromInvoice(invoice);
    const businessSubscription = await this.findActiveSubscription({
      stripe_customer_id: stripeCustomerId,
    });

    const commonData = this.mapInvoiceToPayment(invoice, invoiceId);

    switch (billingReason) {
      case 'subscription_create':
        return this.handleSubscriptionCreate({
          stripeCustomerId,
          businessSubscription,
          plan,
          invoice,
          commonData,
        });

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

  private async handleSubscriptionCreate({
    stripeCustomerId,
    businessSubscription,
    plan,
    invoice,
    commonData,
  }: {
    stripeCustomerId: string;
    businessSubscription: any;
    plan: Plan;
    invoice: Stripe.Invoice;
    commonData: PaymentCreate; // <— aqui!
  }) {
    const { start, end } = this.getPeriodFromFirstLine(invoice);
    const subscriptionId = this.getStripeSubscriptionId(invoice);

    const business = await this.prisma.business.findFirst({
      where: { stripe_customer_id: stripeCustomerId },
      select: { id: true },
    });
    if (!business)
      throw new Error(`Business não encontrado (customer=${stripeCustomerId})`);

    if (businessSubscription) {
      await this.prisma.businessSubscription.update({
        where: { id: businessSubscription.id },
        data: {
          status: 'CANCELED',
          subscription_histories: {
            create: {
              action: 'CANCELED',
              previousPlanId: businessSubscription.planId,
              reason: 'Upgrade para novo plano',
            },
          },
        },
      });
    }

    await this.prisma.businessSubscription.create({
      data: {
        business: { connect: { id: business.id } },
        plan: { connect: { id: plan.id } },
        stripeCustomerId,
        stripeSubscriptionId: subscriptionId,
        status: 'ACTIVE',
        current_period_start: start ? new Date(start * 1000) : undefined,
        current_period_end: end ? new Date(end * 1000) : undefined,
        Payment: { create: commonData }, // agora bate com o tipo
        subscription_histories: {
          create: { action: 'CREATED', newPlanId: plan.id },
        },
      },
    });
  }

  private async handleSubscriptionUpdate(
    businessSubscription: any,
    plan: Plan,
    invoice: Stripe.Invoice,
    commonData: PaymentCreate, // <— aqui também!
  ) {
    if (!businessSubscription) {
      this.logger.warn('Assinatura local não encontrada para atualizar');
      return;
    }

    const { start, end } = this.getPeriodFromFirstLine(invoice);
    const subscriptionId = this.getStripeSubscriptionId(invoice);

    const updates: any = {
      stripeSubscriptionId: subscriptionId,
      status: 'ACTIVE',
      Payment: { create: commonData },
    };

    if (start) updates.current_period_start = new Date(start * 1000);
    if (end) updates.current_period_end = new Date(end * 1000);

    const changedPlan = businessSubscription.planId !== plan.id;
    updates.subscription_histories = {
      create: {
        action: 'RENEWED',
        previousPlanId: changedPlan ? businessSubscription.planId : undefined,
        newPlanId: changedPlan ? plan.id : undefined,
      },
    };
    if (changedPlan) {
      updates.plan = { connect: { id: plan.id } };
    }

    await this.prisma.businessSubscription.update({
      where: { id: businessSubscription.id },
      data: updates,
    });
  }

  private async handleManualInvoice(invoice: Stripe.Invoice) {
    this.logger.log(`Manual invoice received. Invoice ID: ${invoice.id}`);
  }

  private mapInvoiceToPayment(
    invoice: Stripe.Invoice,
    invoiceId: string,
  ): PaymentCreate {
    const paidAtSec = invoice.status_transitions?.paid_at ?? invoice.created;
    return {
      stripeInvoiceId: invoiceId,
      amount_paid_in_cents: invoice.amount_paid,
      currency: invoice.currency,
      paid_at: new Date(paidAtSec * 1000),
      status: 'PAID',
    };
  }

  private async findActiveSubscription({
    stripe_customer_id,
  }: {
    stripe_customer_id: string;
  }) {
    return this.prisma.businessSubscription.findFirst({
      where: {
        business: { stripe_customer_id },
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
      },
    });
  }

  private async getPlanFromInvoice(invoice: Stripe.Invoice) {
    const firstLine = invoice.lines.data?.[0];
    if (!firstLine) throw new Error(`Invoice ${invoice.id} sem linhas`);

    // Com expand ['lines.data.price'], o tipo seguro é:
    // firstLine.price: Stripe.Price | null
    const priceObj = (firstLine as any).price as
      | Stripe.Price
      | null
      | undefined;
    const priceId =
      typeof priceObj === 'string'
        ? priceObj
        : (priceObj?.id ??
          // fallback pro seu payload antigo:
          (firstLine as any)?.pricing?.price_details?.price);

    if (!priceId)
      throw new Error(
        `Não foi possível identificar o priceId na invoice ${invoice.id}`,
      );

    const plan = await this.prisma.plan.findUnique({
      where: { stripePriceId: priceId },
    });
    if (!plan) throw new Error(`Plano não encontrado para priceId: ${priceId}`);
    return plan;
  }

  /** Extrai o período do ciclo a partir da PRIMEIRA linha da invoice */
  private getPeriodFromFirstLine(invoice: Stripe.Invoice): {
    start?: number;
    end?: number;
  } {
    const line = invoice.lines?.data?.[0] as any;
    const start = line?.period?.start as number | undefined;
    const end = line?.period?.end as number | undefined;
    return { start, end };
  }

  /** Obtém subscriptionId do shape que você mostrou (parent.subscription_details) com fallback para a linha */
  private getStripeSubscriptionId(invoice: Stripe.Invoice): string | undefined {
    const fromParent = (invoice as any)?.parent?.subscription_details
      ?.subscription;
    if (typeof fromParent === 'string') return fromParent;

    const fromLine = (invoice.lines?.data?.[0] as any)?.parent
      ?.subscription_item_details?.subscription;
    if (typeof fromLine === 'string') return fromLine;

    return undefined;
  }

  private async createWebhookLog(event: Stripe.Event) {
    try {
      await this.prisma.webhookEvent.create({
        data: {
          event_id: event.id,
          type: event.type,
          payload: event as any,
        },
      });
    } catch {
      this.logger.debug(`Webhook ${event.id} já logado (ok)`);
    }
  }
}
