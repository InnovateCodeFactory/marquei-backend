import * as Joi from 'joi';

export type EnvSchemaType = {
  NODE_ENV: string;
  PORT: number;

  JWT_SECRET: string;

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

  APITALLY_API_KEY: string;
  APITALLY_ENV: string;
};

export const envValidationSchema = Joi.object<EnvSchemaType>({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000).positive().integer().required(),

  JWT_SECRET: Joi.string().required(),

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

  APITALLY_API_KEY: Joi.string().required(),
  APITALLY_ENV: Joi.string().valid('dev', 'prod').required(),
});
