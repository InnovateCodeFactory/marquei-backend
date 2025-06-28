import { Module } from '@nestjs/common';
import { WelcomeUseCase } from './use-cases';

@Module({
  providers: [WelcomeUseCase],
})
export class InAppNotificationsModule {}
