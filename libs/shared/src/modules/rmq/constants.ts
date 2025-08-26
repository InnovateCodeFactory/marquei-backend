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
  MAIL_NOTIFICATIONS: {
    // PROFESSIONAL MAIL QUEUES
    SEND_WELCOME_PROFESSIONAL_MAIL_QUEUE:
      'messaging.mail_notifications.send_welcome_professional_mail_queue',
    SEND_NEW_APPOINTMENT_PROFESSIONAL_MAIL_QUEUE:
      'messaging.mail_notifications.send_new_appointment_professional_mail_queue',

    // CUSTOMER MAIL QUEUES
    SEND_WELCOME_CUSTOMER_MAIL_QUEUE:
      'messaging.mail_notifications.send_welcome_customer_mail_queue',

    // COMMON MAIL QUEUES
    SEND_CODE_VALIDATION_MAIL_QUEUE:
      'messaging.mail_notifications.send_code_validation_mail_queue',
  },
  SMS_NOTIFICATIONS: {},
};
