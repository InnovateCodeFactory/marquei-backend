import { SendMailTypeEnum } from '../enum';

export type MailTemplateDataMap = {
  [SendMailTypeEnum.WELCOME_PROFESSIONAL]: { NAME: string; PREHEADER: string };
  [SendMailTypeEnum.WELCOME_CUSTOMER]: { NAME: string; PREHEADER: string };
  [SendMailTypeEnum.VALIDATION_CODE]: { CODE: string; PREHEADER: string };
  [SendMailTypeEnum.PASSWORD_RESET]: { NAME: string; RESET_URL: string };
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
  [SendMailTypeEnum.APPOINTMENT_CANCELLATION]: {
    CLIENT_NAME: string;
    SERVICE_NAME: string;
    APPT_DATE: string;
    APPT_TIME: string;
  };
};
