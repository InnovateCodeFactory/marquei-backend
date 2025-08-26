import { Module } from '@nestjs/common';
import { MailBaseService } from './mail-base.service';
import {
  CreateMailTemplateUseCase,
  SendCodeValidationMailUseCase,
  SendWelcomeCustomerMailUseCase,
  SendWelcomeProfessionalMailUseCase,
} from './use-cases';

@Module({
  imports: [],
  providers: [
    MailBaseService,
    SendWelcomeProfessionalMailUseCase,
    SendWelcomeCustomerMailUseCase,
    CreateMailTemplateUseCase,
    SendCodeValidationMailUseCase,
  ],
})
export class MailsModule {}
