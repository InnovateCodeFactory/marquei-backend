import { UserTypeEnum } from '@app/shared/enum';

export class SendValidationTokenDto {
  phone_number: string;
  user_type: UserTypeEnum;
  request_id: string;
}
