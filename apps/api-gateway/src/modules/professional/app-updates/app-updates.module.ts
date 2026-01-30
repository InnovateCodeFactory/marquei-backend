import { PrismaService } from '@app/shared';
import { Module } from '@nestjs/common';
import { HomeModalsController } from './app-updates.controller';
import {
  GetAppReviewEligibilityUseCase,
  GetHomeModalUseCase,
  RegisterAppUpdateInteractionUseCase,
  RegisterAppReviewEventUseCase,
} from './use-cases';

@Module({
  controllers: [HomeModalsController],
  providers: [
    GetHomeModalUseCase,
    RegisterAppUpdateInteractionUseCase,
    GetAppReviewEligibilityUseCase,
    RegisterAppReviewEventUseCase,
    PrismaService,
  ],
})
export class AppUpdatesModule {}
