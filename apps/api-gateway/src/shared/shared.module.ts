import { Global, Module } from '@nestjs/common';
import { WhatsAppValidationService } from './services';
import { MailService } from './services/mail.service';

@Global()
@Module({
  providers: [MailService, WhatsAppValidationService],
  exports: [MailService, WhatsAppValidationService],
})
export class SharedModule {}
