import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { GoogleCalendarIntegrationsController } from './integrations.controller';
import {
  GetGoogleCalendarAuthUrlUseCase,
  GetGoogleCalendarStatusUseCase,
  GoogleCalendarCallbackUseCase,
} from './use-cases';

@Module({
  controllers: [GoogleCalendarIntegrationsController],
  providers: [
    ResponseHandlerService,
    GetGoogleCalendarAuthUrlUseCase,
    GoogleCalendarCallbackUseCase,
    GetGoogleCalendarStatusUseCase,
  ],
})
export class IntegrationsModule {}
