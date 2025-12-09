import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { GoogleCalendarIntegrationsController } from './integrations.controller';
import { GetGoogleCalendarAuthUrlUseCase } from './use-cases';

@Module({
  controllers: [GoogleCalendarIntegrationsController],
  providers: [ResponseHandlerService, GetGoogleCalendarAuthUrlUseCase],
})
export class IntegrationsModule {}

