import { SendMailTypeEnum } from '../enum';

type BaseTemplate = { PREHEADER: string };

export type MailTemplateDataMap = {
  // bem-vindo
  [SendMailTypeEnum.WELCOME_PROFESSIONAL]: BaseTemplate & { NAME: string };
  [SendMailTypeEnum.WELCOME_CUSTOMER]: BaseTemplate & { NAME: string };

  // Email de validação
  [SendMailTypeEnum.VALIDATION_CODE]: BaseTemplate & { CODE: string };

  // agendamento
  [SendMailTypeEnum.NEW_APPOINTMENT]: BaseTemplate & {
    TO_NAME: string;
    BY_NAME: string;
    SERVICE_NAME: string;
    APPT_DATE: string;
    APPT_TIME: string;
    PRICE: string;
    CLIENT_NOTES: string;
    DURATION: string;
  };

  [SendMailTypeEnum.APPOINTMENT_CONFIRMATION]: BaseTemplate & {
    CLIENT_NAME: string;
    SERVICE_NAME: string;
    APPT_DATE: string;
    APPT_TIME: string;
  };

  [SendMailTypeEnum.APPOINTMENT_REMINDER]: BaseTemplate & {
    CLIENT_NAME: string;
    SERVICE_NAME: string;
    APPT_DATE: string;
    APPT_TIME: string;
  };

  [SendMailTypeEnum.APPOINTMENT_CANCELLATION]: BaseTemplate & {
    TO_NAME: string;
    BY_NAME: string;
    BY_TYPE_LABEL: string;
    SERVICE_NAME: string;
    APPT_DATE: string;
    APPT_TIME: string;
    DURATION: string;
    PRICE: string;
  };

  [SendMailTypeEnum.APPOINTMENT_RESCHEDULE]: BaseTemplate & {
    TO_NAME: string;
    BY_NAME: string;
    BY_TYPE_LABEL: string;
    SERVICE_NAME: string;
    APPT_DATE: string;
    APPT_TIME: string;
    DURATION: string;
    PRICE: string;
    CLIENT_NOTES: string;
  };
};
