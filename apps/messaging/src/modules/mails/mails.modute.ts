import { Module } from '@nestjs/common';
import { MailBaseService } from './mail-base.service';
import {
  CreateMailTemplateUseCase,
  SendCancelAppointmentCustomerMailUseCase,
  SendCancelAppointmentProfessionalMailUseCase,
  SendCodeValidationMailUseCase,
  SendNewAppointmentMailUseCase,
  SendWelcomeCustomerMailUseCase,
  SendWelcomeProfessionalMailUseCase,
} from './use-cases';

@Module({
  imports: [],
  providers: [
    //professional
    SendCancelAppointmentProfessionalMailUseCase,
    SendWelcomeProfessionalMailUseCase,

    //customer
    SendWelcomeCustomerMailUseCase,
    SendCancelAppointmentCustomerMailUseCase,
    //common
    MailBaseService,
    CreateMailTemplateUseCase,
    SendCodeValidationMailUseCase,
    SendNewAppointmentMailUseCase,
  ],
})
export class MailsModule {}
