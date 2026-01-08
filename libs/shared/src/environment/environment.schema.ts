import * as Joi from 'joi';

export type EnvSchemaType = {
  NODE_ENV: string;
  PORT: number;
  TZ: string;

  JWT_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string; // e.g., 15m
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string; // e.g., 30d

  DATABASE_URL: string;

  RABBITMQ_USER: string;
  RABBITMQ_PASS: string;
  RABBITMQ_PORT: number;
  RABBITMQ_DASH_PORT: number;
  RABBITMQ_HOST: string;

  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASS: string;

  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;

  REVENUE_CAT_BEARER_TOKEN: string;

  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET: string;
  R2_ENDPOINT: string;
  R2_REGION: string;
  R2_SIGNED_URL_TTL: number;
  R2_CUSTOM_DOMAIN: string;

  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_USE_SSL: string;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_BUCKET: string;
  MINIO_SIGNED_URL_TTL: number;
  MINIO_PUBLIC_BASE: string;

  MAIL_USER: string;
  MAIL_PASS: string;
  MAIL_HOST: string;
  MAIL_PORT: number;

  ENCRYPTION_KEY: string;

  WHATSAPP_API_URL: string;
  WHATSAPP_API_USERNAME: string;
  WHATSAPP_API_PASSWORD: string;
  WHATSAPP_API_SESSION_ID: string;

  MAPBOX_ACCESS_TOKEN: string;

  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALENDAR_REDIRECT_URI: string;

  WEB_APP_ORIGINS: string;
  WEB_COOKIE_DOMAIN: string;
  WEB_COOKIE_SAMESITE: string;
  TEST_BUSINESS_USER_WHITELIST: string;
};

export const envValidationSchema = Joi.object<EnvSchemaType>({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000).positive().integer().required(),
  TZ: Joi.string().default('America/Sao_Paulo').required(),

  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().allow(''),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  DATABASE_URL: Joi.string().uri().required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().positive().integer().required(),
  REDIS_PASS: Joi.string().allow(''),

  RABBITMQ_DASH_PORT: Joi.number()
    .default(15672)
    .positive()
    .integer()
    .required(),
  RABBITMQ_USER: Joi.string().required(),
  RABBITMQ_PASS: Joi.string().required(),
  RABBITMQ_PORT: Joi.number().positive().integer().required(),
  RABBITMQ_HOST: Joi.string().required(),

  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),

  REVENUE_CAT_BEARER_TOKEN: Joi.string().required(),

  R2_ACCESS_KEY_ID: Joi.string().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().required(),
  R2_BUCKET: Joi.string().required(),
  R2_ENDPOINT: Joi.string().uri().required(),
  R2_REGION: Joi.string().default('auto').required(),
  R2_SIGNED_URL_TTL: Joi.number().default(3600).positive().integer().required(),
  R2_CUSTOM_DOMAIN: Joi.string().uri().required(),

  MINIO_ENDPOINT: Joi.string().required(),
  MINIO_PORT: Joi.number().default(9100).positive().integer().required(),
  MINIO_USE_SSL: Joi.string()
    .valid('true', 'false')
    .default('false')
    .required(),
  MINIO_ACCESS_KEY: Joi.string().required(),
  MINIO_SECRET_KEY: Joi.string().required(),
  MINIO_BUCKET: Joi.string().required(),
  MINIO_SIGNED_URL_TTL: Joi.number()
    .default(3600)
    .positive()
    .integer()
    .required(),
  MINIO_PUBLIC_BASE: Joi.string().uri().required(),

  MAIL_USER: Joi.string().required(),
  MAIL_PASS: Joi.string().required(),
  MAIL_HOST: Joi.string().required(),
  MAIL_PORT: Joi.number().positive().integer().required(),

  ENCRYPTION_KEY: Joi.string().length(32).required(),

  WHATSAPP_API_URL: Joi.string().uri().required(),
  WHATSAPP_API_USERNAME: Joi.string().required(),
  WHATSAPP_API_PASSWORD: Joi.string().required(),
  WHATSAPP_API_SESSION_ID: Joi.string().required(),

  MAPBOX_ACCESS_TOKEN: Joi.string().required(),

  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CALENDAR_REDIRECT_URI: Joi.string().uri().required(),

  WEB_APP_ORIGINS: Joi.string(),
  WEB_COOKIE_DOMAIN: Joi.string().allow(''),
  WEB_COOKIE_SAMESITE: Joi.string()
    .valid('lax', 'strict', 'none')
    .default('lax'),
  TEST_BUSINESS_USER_WHITELIST: Joi.string().allow('').default(''),
});
