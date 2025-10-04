import { SendMailTypeEnum, UserTypeEnum } from '@app/shared/enum';
import { Injectable } from '@nestjs/common';
import { MailValidationService } from 'apps/api-gateway/src/shared/services';
import { SendMailValidationTokenDto } from '../dto/requests/send-mail-validation-token.dto';

@Injectable()
export class SendMailValidationTokenUseCase {
  constructor(private readonly mailService: MailValidationService) {}

  async execute(dto: SendMailValidationTokenDto) {
    await this.mailService.sendCode({
      request_id: dto.request_id,
      to: dto.email,
      type: SendMailTypeEnum.VALIDATION_CODE,
      user_type: UserTypeEnum.PROFESSIONAL,
    });
    return null;
  }
}

