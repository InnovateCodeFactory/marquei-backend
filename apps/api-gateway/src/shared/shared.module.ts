import { Global, Module } from '@nestjs/common';
import { WhatsAppValidationService } from './services';
import { MailValidationService } from './services/mail.service';

@Global()
@Module({
  providers: [MailValidationService, WhatsAppValidationService],
  exports: [MailValidationService, WhatsAppValidationService],
})
export class SharedModule {}
