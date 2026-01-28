import { Module } from '@nestjs/common';
import { AppUpdatesController } from './app-updates.controller';
import { GetAppUpdateByIdUseCase, GetAppUpdateModalUseCase } from './use-cases';
import { PrismaService } from '@app/shared';

@Module({
  controllers: [AppUpdatesController],
  providers: [GetAppUpdateByIdUseCase, GetAppUpdateModalUseCase, PrismaService],
})
export class AppUpdatesModule {}
