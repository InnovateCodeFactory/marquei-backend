import { PrismaService } from '@app/shared';
import { Module } from '@nestjs/common';
import { AppUpdatesController } from './app-updates.controller';
import {
  GetAppUpdateModalUseCase,
  RegisterAppUpdateInteractionUseCase,
} from './use-cases';

@Module({
  controllers: [AppUpdatesController],
  providers: [
    GetAppUpdateModalUseCase,
    RegisterAppUpdateInteractionUseCase,
    PrismaService,
  ],
})
export class AppUpdatesModule {}
