// PAYMENT QUEUES

// use-cases
export const CREATE_STRIPE_CUSTOMER_QUEUE =
  'payment.create_stripe_customer_queue';
export const CREATE_STRIPE_SUBSCRIPTION_QUEUE =
  'payment.create_stripe_subscription_queue';

// webhooks
export const STRIPE_WEBHOOK_HANDLER_QUEUE =
  'payment.stripe_webhook_handler_queue';

export const STRIPE_INVOICE_WEBHOOK_QUEUE =
  'payment.stripe_invoice_webhook_queue';
export const STRIPE_CUSTOMER_SUBSCRIPTION_QUEUE =
  'payment.stripe_customer_subscription_queue';
