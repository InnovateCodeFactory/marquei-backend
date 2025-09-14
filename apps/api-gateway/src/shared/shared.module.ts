import { Global, Module } from '@nestjs/common';
import { LoggingHandlerQueue, WhatsAppValidationService } from './services';
import { MailValidationService } from './services/mail.service';

@Global()
@Module({
  providers: [
    MailValidationService,
    WhatsAppValidationService,
    LoggingHandlerQueue,
  ],
  exports: [
    MailValidationService,
    WhatsAppValidationService,
    LoggingHandlerQueue,
  ],
})
export class SharedModule {}
