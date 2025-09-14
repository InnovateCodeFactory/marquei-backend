import { UserTypeEnum } from '@app/shared/enum';
import { codeGenerator } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';
import { WhatsAppValidationService } from 'apps/api-gateway/src/shared/services/whatsapp-validation.service';
import { SendPhoneValidationTokenDto } from '../dto/requests/send-phone-validation-token.dto';

@Injectable()
export class SendPhoneValidationTokenUseCase {
  constructor(
    private readonly whatsappValidationService: WhatsAppValidationService,
  ) {}

  async execute({ phone_number }: SendPhoneValidationTokenDto) {
    const request_id = codeGenerator({
      length: 32,
    });

    await this.whatsappValidationService.sendCode({
      phone_number,
      user_type: UserTypeEnum.CUSTOMER,
      request_id,
    });

    return {
      request_id,
    };
  }
}
