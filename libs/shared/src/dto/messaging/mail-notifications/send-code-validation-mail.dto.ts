import { SendMailTypeEnum } from '@app/shared/enum';

export class SendCodeValidationMailDto {
  to: string;
  type: SendMailTypeEnum;

  constructor(obj: SendCodeValidationMailDto) {
    Object.assign(this, obj);
  }
}
