import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { InAppNotificationsController } from './in-app-notifications.controller';
import {
  GetNotificationsUseCase,
  HasUnreadNotificationsUseCase,
} from './use-cases';

@Module({
  controllers: [InAppNotificationsController],
  providers: [
    ResponseHandlerService,
    HasUnreadNotificationsUseCase,
    GetNotificationsUseCase,
  ],
})
export class InAppNotificationsModule {}
