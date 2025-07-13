import { EnvSchemaType } from '@app/shared/environment';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { AppModule } from './app.module';
import { swagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: '*',
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
  const logger = new Logger('Main');

  swagger(app);
  // teste

  try {
    const PORT = configService.getOrThrow('PORT');

    await app.listen(PORT, '0.0.0.0');
    logger.debug(`🚀 API Gateway is running on: http://localhost:${PORT}/api`);
  } catch (error) {
    logger.error(`Error starting API Gateway: ${error.message}`, error.stack);
  }
}
bootstrap();
