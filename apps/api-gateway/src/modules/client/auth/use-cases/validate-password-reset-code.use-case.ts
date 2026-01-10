import { RedisService } from '@app/shared/modules/redis/redis.service';
import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import { CachedKeys } from '@app/shared/utils/cached-keys';
import { BadRequestException, Injectable } from '@nestjs/common';
import { WhatsAppValidationService } from 'apps/api-gateway/src/shared/services';
import { ForgotPasswordValidateDto } from '../dto/requests/forgot-password-validate.dto';

@Injectable()
export class ValidatePasswordResetCodeUseCase {
  private readonly ttlInSeconds = 60 * 10;

  constructor(
    private readonly whatsappValidationService: WhatsAppValidationService,
    private readonly redisService: RedisService,
  ) {}

  async execute({ code, request_id }: ForgotPasswordValidateDto, req: AppRequest) {
    const key = CachedKeys.CUSTOMER_PASSWORD_RESET({ request_id });
    const cached = await this.redisService.get({ key });

    if (!cached)
      throw new BadRequestException('Requisição inválida ou expirada');

    const isValid = await this.whatsappValidationService.validateCode({
      code,
      request_id,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent'] || '',
    });

    if (!isValid)
      throw new BadRequestException('Código inválido ou expirado');

    let parsed: { user_id?: string; validated?: boolean } | null = null;
    try {
      parsed = JSON.parse(cached);
    } catch {
      parsed = null;
    }

    if (!parsed?.user_id)
      throw new BadRequestException('Requisição inválida ou expirada');

    await this.redisService.set({
      key,
      value: JSON.stringify({ user_id: parsed.user_id, validated: true }),
      ttlInSeconds: this.ttlInSeconds,
    });

    return true;
  }
}
