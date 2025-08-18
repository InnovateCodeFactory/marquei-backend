// PAYMENT QUEUES

export const PAYMENT_QUEUES = {
  WEBHOOKS: {
    STRIPE_WEBHOOK_HANDLER_QUEUE: 'payment.stripe_webhook_handler_queue',
    STRIPE_INVOICE_WEBHOOK_QUEUE: 'payment.stripe_invoice_webhook_queue',
    STRIPE_CUSTOMER_SUBSCRIPTION_QUEUE:
      'payment.stripe_customer_subscription_queue',
    STRIPE_SETUP_INTENT_QUEUE: 'payment.stripe_setup_intent_queue',
  },
  USE_CASES: {
    CREATE_STRIPE_CUSTOMER_QUEUE: 'payment.create_stripe_customer_queue',
    CREATE_STRIPE_SUBSCRIPTION_QUEUE:
      'payment.create_stripe_subscription_queue',
    STRIPE_SETUP_INTENT_QUEUE: 'payment.stripe_setup_intent_queue',
  },
};

export const MESSAGING_QUEUES = {
  IN_APP_NOTIFICATIONS: {
    WELCOME_QUEUE: 'messaging.in_app_notifications.welcome_queue',
  },
  PUSH_NOTIFICATIONS: {
    APPOINTMENT_CREATED_QUEUE:
      'messaging.push_notifications.appointment_created_queue',
  },
  EMAIL_NOTIFICATIONS: {},
  SMS_NOTIFICATIONS: {},
};
