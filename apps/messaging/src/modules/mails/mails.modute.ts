import { Module } from '@nestjs/common';
import { MailBaseService } from './mail-base.service';
import {
  CreateMailTemplateUseCase,
  SendCodeValidationMailUseCase,
  SendWelcomeCustomerMailUseCase,
  SendWelcomeProfessionalMailUseCase,
} from './use-cases';
import { SendNewAppointmentMailUseCase } from './use-cases/professional/send-new-appointment-mail.use-case';

@Module({
  imports: [],
  providers: [
    MailBaseService,
    SendWelcomeProfessionalMailUseCase,
    SendWelcomeCustomerMailUseCase,
    CreateMailTemplateUseCase,
    SendCodeValidationMailUseCase,
    SendNewAppointmentMailUseCase,
  ],
})
export class MailsModule {}
