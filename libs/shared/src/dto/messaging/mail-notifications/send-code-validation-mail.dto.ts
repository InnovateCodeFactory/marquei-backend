import { SendMailTypeEnum, UserTypeEnum } from '@app/shared/enum';

export class SendCodeValidationMailDto {
  to: string;
  type: SendMailTypeEnum;
  user_type: UserTypeEnum;
  request_id?: string;

  constructor(obj: SendCodeValidationMailDto) {
    Object.assign(this, obj);
  }
}
