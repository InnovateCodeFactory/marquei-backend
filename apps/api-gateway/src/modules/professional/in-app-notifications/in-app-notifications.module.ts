import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { InAppNotificationsController } from './in-app-notifications.controller';
import {
  GetNotificationsUseCase,
  HasUnreadNotificationsUseCase,
  MarkAllInAppNotificationsAsReadUseCase,
  MarkNotificationAsReadUseCase,
} from './use-cases';

@Module({
  controllers: [InAppNotificationsController],
  providers: [
    ResponseHandlerService,
    HasUnreadNotificationsUseCase,
    GetNotificationsUseCase,
    MarkAllInAppNotificationsAsReadUseCase,
    MarkNotificationAsReadUseCase,
  ],
})
export class InAppNotificationsModule {}
