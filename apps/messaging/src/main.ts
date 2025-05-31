import { NestFactory } from '@nestjs/core';
import { MessagingModule } from './messaging.module';

async function bootstrap() {
  const app = await NestFactory.create(MessagingModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
