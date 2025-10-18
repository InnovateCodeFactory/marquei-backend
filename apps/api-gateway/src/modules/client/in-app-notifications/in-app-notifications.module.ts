import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { InAppNotificationsController } from './in-app-notifications.controller';
import { MarkNotificationAsReadUseCase } from './use-cases';

@Module({
  controllers: [InAppNotificationsController],
  providers: [ResponseHandlerService, MarkNotificationAsReadUseCase],
})
export class InAppNotificationsModule {}
