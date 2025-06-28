import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MessagingModule } from './messaging.module';

async function bootstrap() {
  const app = await NestFactory.create(MessagingModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(3002);
}
bootstrap();
