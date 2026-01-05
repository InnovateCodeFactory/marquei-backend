import { EnvSchemaType } from '@app/shared/environment';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { AppModule } from './app.module';
import { swagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.set('trust proxy', 'loopback');
  app.setGlobalPrefix('api');
  const allowedOrigins = (process.env.WEB_APP_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }), // necessário para verificar a assinatura
  );

  const configService = app.get(ConfigService<EnvSchemaType>);
  const isProd = configService.get('NODE_ENV') === 'production';
  const logger = new Logger('Main');

  !isProd && swagger(app);

  try {
    const PORT = configService.getOrThrow('PORT');

    await app.listen(PORT, '0.0.0.0');
    logger.debug(`🚀 API Gateway is running on: http://localhost:${PORT}/api`);
  } catch (error) {
    logger.error(`Error starting API Gateway: ${error.message}`, error.stack);
  }
}
bootstrap();
