import { EnvSchemaType } from '@app/shared/environment';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { AppModule } from './app.module';
import { swagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService<EnvSchemaType>);
  app.set('trust proxy', 'loopback');
  app.setGlobalPrefix('api');
  const allowedOriginEntries = (
    configService.get<string>('WEB_APP_ORIGINS') || ''
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = new Set<string>();
  const allowedHosts = new Set<string>();

  for (const entry of allowedOriginEntries) {
    try {
      const parsed = new URL(entry);
      allowedOrigins.add(parsed.origin);
      allowedHosts.add(parsed.host);
      continue;
    } catch {}

    try {
      const parsed = new URL(`https://${entry}`);
      allowedOrigins.add(parsed.origin);
      allowedHosts.add(parsed.host);
    } catch {
      allowedOrigins.add(entry);
    }
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.size === 0) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      try {
        const originHost = new URL(origin).host;
        if (allowedHosts.has(originHost)) return callback(null, true);
      } catch {}
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
