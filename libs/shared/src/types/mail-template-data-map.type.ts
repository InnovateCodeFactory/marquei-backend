import { SendMailTypeEnum } from '../enum';

export type MailTemplateDataMap = {
  // bem-vindo
  [SendMailTypeEnum.WELCOME_PROFESSIONAL]: { NAME: string; PREHEADER: string };
  [SendMailTypeEnum.WELCOME_CUSTOMER]: { NAME: string; PREHEADER: string };
  // Email de validação
  [SendMailTypeEnum.VALIDATION_CODE]: {
    CODE: string;
    PREHEADER: string;
  };

  // agendamento
  [SendMailTypeEnum.NEW_APPOINTMENT_PROFESSIONAL]: {
    PROFESSIONAL_NAME: string;
    CLIENT_NAME: string;
    SERVICE_NAME: string;
    APPT_DATE: string;
    APPT_TIME: string;
    PRICE: string;
    CLIENT_NOTES: string;
    DURATION: string;
  };
  [SendMailTypeEnum.APPOINTMENT_CONFIRMATION]: {
    CLIENT_NAME: string;
    SERVICE_NAME: string;
    APPT_DATE: string;
    APPT_TIME: string;
  };
  [SendMailTypeEnum.APPOINTMENT_REMINDER]: {
    CLIENT_NAME: string;
    SERVICE_NAME: string;
    APPT_DATE: string;
    APPT_TIME: string;
  };
  [SendMailTypeEnum.APPOINTMENT_CANCELLATION_PROFESSIONAL]: {
    CLIENT_NAME: string;
    PROFESSIONAL_NAME: string;
    SERVICE_NAME: string;
    APPT_DATE: string;
    APPT_TIME: string;
    DURATION: string;
    PRICE: string;
    PREHEADER: string;
  };
  [SendMailTypeEnum.APPOINTMENT_CANCELLATION_CUSTOMER]: {
    CLIENT_NAME: string;
    PROFESSIONAL_NAME: string;
    SERVICE_NAME: string;
    APPT_DATE: string;
    APPT_TIME: string;
    DURATION: string;
    PRICE: string;
    PREHEADER: string;
  };
};
