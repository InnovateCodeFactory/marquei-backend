import { Module } from '@nestjs/common';
import { MailBaseService } from './mail-base.service';
import {
  CreateMailTemplateUseCase,
  SendCodeValidationMailUseCase,
  SendWelcomeProfessionalMailUseCase,
} from './use-cases';

@Module({
  imports: [],
  providers: [
    MailBaseService,
    SendWelcomeProfessionalMailUseCase,
    CreateMailTemplateUseCase,
    SendCodeValidationMailUseCase,
  ],
})
export class MailsModule {}
