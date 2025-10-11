import { PrismaService } from '@app/shared';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import { CachedKeys } from '@app/shared/utils/cached-keys';
import { BadRequestException, Injectable } from '@nestjs/common';
import { WhatsAppValidationService } from 'apps/api-gateway/src/shared/services';
import { UpdatePasswordConfirmCodeDto } from '../dto/requests/update-password-confirm-code.dto';

@Injectable()
export class UpdatePasswordConfirmCodeUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly whatsAppValidationService: WhatsAppValidationService,
    private readonly redisService: RedisService,
  ) {}

  async execute(dto: UpdatePasswordConfirmCodeDto, req: AppRequest) {
    const { code, request_id } = dto;

    const isCodeValid = await this.whatsAppValidationService.validateCode({
      code,
      request_id,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent'] || '',
    });

    if (!isCodeValid)
      throw new BadRequestException('Código inválido ou expirado');

    const cachedData = await this.redisService.get({
      key: CachedKeys.PROFESSIONAL_PASSWORD_UPDATE({
        user_id: req.user.id,
        request_id,
      }),
    });

    if (!cachedData)
      throw new BadRequestException('Requisição inválida ou expirada');

    const parsedData: { user_id: string; new_hashed_password: string } =
      JSON.parse(cachedData);

    if (parsedData.user_id !== req.user.id || !parsedData.new_hashed_password)
      throw new BadRequestException('Requisição inválida ou expirada');

    await this.prismaService.user.update({
      where: { id: req.user.id },
      data: { password: parsedData.new_hashed_password },
    });

    return null;
  }
}
