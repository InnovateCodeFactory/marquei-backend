import { PrismaService } from '@app/shared';
import { Module } from '@nestjs/common';
import { HomeModalsController } from './app-updates.controller';
import {
  GetHomeModalUseCase,
  RegisterAppUpdateInteractionUseCase,
} from './use-cases';

@Module({
  controllers: [HomeModalsController],
  providers: [
    GetHomeModalUseCase,
    RegisterAppUpdateInteractionUseCase,
    PrismaService,
  ],
})
export class AppUpdatesModule {}
