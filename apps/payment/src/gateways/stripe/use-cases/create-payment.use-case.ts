import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_PAYMENT_GATEWAY } from '../stripe.constants';

@Injectable()
export class CreatePaymentUseCase implements OnModuleInit {
  private readonly logger = new Logger(CreatePaymentUseCase.name);

  constructor(
    @Inject(STRIPE_PAYMENT_GATEWAY)
    private readonly stripe: Stripe,
  ) {}

  async onModuleInit() {
    // await this.execute();
  }

  async execute() {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: 1000, // Amount in cents
      currency: 'brl',
      payment_method_types: ['card'],
      description: 'Payment for order #12345',
    });

    this.logger.debug(paymentIntent);
  }
}
