import { SendWhatsAppTypeEnum, UserTypeEnum } from '@app/shared/enum';

export class SendValidationTokenDto {
  phone_number: string;
  user_type: UserTypeEnum;
  request_id: string;
  type?: SendWhatsAppTypeEnum = SendWhatsAppTypeEnum.VALIDATION_CODE;

  constructor(props: SendValidationTokenDto) {
    Object.assign(this, props);
  }
}
