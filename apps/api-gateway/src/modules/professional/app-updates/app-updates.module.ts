import { Module } from '@nestjs/common';
import { AppUpdatesController } from './app-updates.controller';
import {
  GetAppUpdateByIdUseCase,
  GetAppUpdateModalUseCase,
  RegisterAppUpdateInteractionUseCase,
} from './use-cases';
import { PrismaService } from '@app/shared';

@Module({
  controllers: [AppUpdatesController],
  providers: [
    GetAppUpdateByIdUseCase,
    GetAppUpdateModalUseCase,
    RegisterAppUpdateInteractionUseCase,
    PrismaService,
  ],
})
export class AppUpdatesModule {}
