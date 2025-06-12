import { PrismaService } from '@app/shared';
import { CREATE_STRIPE_CUSTOMER_QUEUE } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_PAYMENT_GATEWAY } from '../stripe.constants';

@Injectable()
export class CreateCustomerUseCase {
  private readonly logger = new Logger(CreateCustomerUseCase.name);

  constructor(
    private readonly prismaService: PrismaService,

    @Inject(STRIPE_PAYMENT_GATEWAY)
    private readonly stripe: Stripe,
  ) {}

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    queue: CREATE_STRIPE_CUSTOMER_QUEUE,
    routingKey: CREATE_STRIPE_CUSTOMER_QUEUE,
  })
  async execute({ businessId }: { businessId: string }) {
    try {
      const business = await this.prismaService.business.findUnique({
        where: { id: businessId },
      });

      if (!business)
        throw new Error(`Business with ID ${businessId} not found`);

      const stripeCustomer = await this.stripe.customers.create({
        name: business.name,
        email: business.email,
        metadata: {
          businessId: business.id,
        },
      });

      await this.prismaService.business.update({
        where: { id: businessId },
        data: {
          stripe_customer_id: stripeCustomer.id,
        },
      });

      this.logger.debug(
        `Stripe customer created for businessId ${businessId}: ${stripeCustomer.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error creating Stripe customer for businessId ${businessId}:`,
        error,
      );
    }
  }
}
