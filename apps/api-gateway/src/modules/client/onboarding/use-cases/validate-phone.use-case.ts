import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';
import { WhatsAppValidationService } from 'apps/api-gateway/src/shared/services';
import { ValidatePhoneDto } from '../dto/requests/validate-phone.dto';

@Injectable()
export class ValidatePhoneUseCase {
  constructor(
    private readonly whatsappValidationService: WhatsAppValidationService,
  ) {}

  async execute({ code, request_id }: ValidatePhoneDto, req: AppRequest) {
    return this.whatsappValidationService.validateCode({
      code,
      request_id,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent'],
    });
  }
}
