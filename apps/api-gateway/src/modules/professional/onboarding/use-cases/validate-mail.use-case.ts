import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';
import { MailValidationService } from 'apps/api-gateway/src/shared/services';
import { ValidatePhoneDto } from '../dto/requests/validate-phone.dto';

@Injectable()
export class ValidateMailUseCase {
  constructor(private readonly mailValidationService: MailValidationService) {}

  async execute({ code, request_id }: ValidatePhoneDto, req: AppRequest) {
    return this.mailValidationService.validateCode({
      code,
      request_id,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent'],
    });
  }
}

