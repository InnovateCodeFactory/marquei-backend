import { SendMailTypeEnum } from '@app/shared/enum';

export class CreateMailTemplateDto {
  description: string;
  pre_header: string;
  subject: string;
  type: SendMailTypeEnum;
  html: string;
  from: string;
}
