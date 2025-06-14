import { PrismaService } from '@app/shared';
import { CREATE_STRIPE_SUBSCRIPTION_QUEUE } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_PAYMENT_GATEWAY } from '../stripe.constants';

@Injectable()
export class CreateSubscriptionUseCase {
  private readonly logger = new Logger(CreateSubscriptionUseCase.name);

  constructor(
    @Inject(STRIPE_PAYMENT_GATEWAY)
    private readonly stripe: Stripe,

    private readonly prismaService: PrismaService,
  ) {}

  @RabbitRPC({
    exchange: RABBIT_EXCHANGE,
    queue: CREATE_STRIPE_SUBSCRIPTION_QUEUE,
    routingKey: CREATE_STRIPE_SUBSCRIPTION_QUEUE,
  })
  async execute(data: {
    price_id: string;
    stripe_customer_id: string;
    business_id: string;
  }) {
    const { price_id, stripe_customer_id, business_id } = data;

    try {
      if (!price_id || !stripe_customer_id) {
        throw new Error('Price ID and Stripe Customer ID are required');
      }

      const [paymentMethods, product] = await Promise.all([
        await this.stripe.paymentMethods.list({
          customer: stripe_customer_id,
          type: 'card',
        }),
        await this.prismaService.plan.findFirst({
          where: {
            stripePriceId: price_id,
          },
          select: {
            price_in_cents: true,
            billing_period: true,
          },
        }),
      ]);

      const savedPaymentMethod = paymentMethods.data?.[0]; // pega o mais recente

      if (!savedPaymentMethod) {
        throw new Error('Cliente não tem cartão salvo');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: product.price_in_cents,
        currency: 'brl',
        customer: stripe_customer_id,
        payment_method: savedPaymentMethod.id,
        confirm: true,
        off_session: true, // se o cliente não estiver presente
        ...(product?.billing_period === 'YEARLY' && {
          payment_method_options: {
            card: {
              installments: {
                enabled: true,
                plan: {
                  count: 12, // ou o número de parcelas que você quiser fixar
                  interval: 'month',
                  type: 'fixed_count',
                },
              },
            },
          },
        }),
      });

      const { client_secret } = paymentIntent;

      return {
        client_secret,
      };
    } catch (error) {
      this.logger.error('Error creating subscription', error);
      return null;
    }
  }
}
