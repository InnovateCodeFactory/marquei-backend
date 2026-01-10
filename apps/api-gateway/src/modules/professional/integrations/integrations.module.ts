import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { GoogleCalendarIntegrationsController } from './integrations.controller';
import {
  DisconnectGoogleCalendarUseCase,
  GetGoogleCalendarAuthUrlUseCase,
  GetGoogleCalendarStatusUseCase,
  GoogleCalendarCallbackUseCase,
} from './use-cases';

@Module({
  controllers: [GoogleCalendarIntegrationsController],
  providers: [
    ResponseHandlerService,
    DisconnectGoogleCalendarUseCase,
    GetGoogleCalendarAuthUrlUseCase,
    GoogleCalendarCallbackUseCase,
    GetGoogleCalendarStatusUseCase,
  ],
})
export class IntegrationsModule {}
