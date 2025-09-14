import { Module } from '@nestjs/common';
import { MailBaseService } from './mail-base.service';
import {
  CreateMailTemplateUseCase,
  SendCancelAppointmentMailUseCase,
  SendCodeValidationMailUseCase,
  SendNewAppointmentMailUseCase,
  SendRescheduleAppointmentMailUseCase,
  SendWelcomeCustomerMailUseCase,
  SendWelcomeProfessionalMailUseCase,
} from './use-cases';

@Module({
  imports: [],
  providers: [
    //professional
    SendWelcomeProfessionalMailUseCase,

    //customer
    SendWelcomeCustomerMailUseCase,
    //common
    MailBaseService,
    CreateMailTemplateUseCase,
    SendCodeValidationMailUseCase,
    SendNewAppointmentMailUseCase,
    SendCancelAppointmentMailUseCase,
    SendRescheduleAppointmentMailUseCase,
  ],
})
export class MailsModule {}
