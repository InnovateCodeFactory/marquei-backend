import { PrismaService } from '@app/shared';
import { UserTypeEnum } from '@app/shared/enum';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { CachedKeys } from '@app/shared/utils/cached-keys';
import { formatPhoneNumber, generateRandomString } from '@app/shared/utils';
import { BadRequestException, Injectable } from '@nestjs/common';
import { WhatsAppValidationService } from 'apps/api-gateway/src/shared/services/whatsapp-validation.service';
import { ForgotPasswordRequestDto } from '../dto/requests/forgot-password-request.dto';

@Injectable()
export class RequestPasswordResetUseCase {
  private readonly requestIdLength = 32;
  private readonly ttlInSeconds = 60 * 10;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly whatsappValidationService: WhatsAppValidationService,
  ) {}

  async execute({ email }: ForgotPasswordRequestDto) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prismaService.user.findFirst({
      where: {
        email: normalizedEmail,
        user_type: 'PROFESSIONAL',
      },
      select: {
        id: true,
        professional_profile: {
          select: { phone: true },
        },
      },
    });

    if (!user) throw new BadRequestException('Usuário não encontrado');

    const phone = user.professional_profile?.[0]?.phone;
    if (!phone) throw new BadRequestException('Telefone não encontrado');

    const request_id = generateRandomString(this.requestIdLength);

    await this.redisService.set({
      key: CachedKeys.PROFESSIONAL_PASSWORD_RESET({ request_id }),
      value: JSON.stringify({ user_id: user.id, validated: false }),
      ttlInSeconds: this.ttlInSeconds,
    });

    await this.whatsappValidationService.sendCode({
      phone_number: phone,
      user_type: UserTypeEnum.PROFESSIONAL,
      request_id,
    });

    return {
      request_id,
      phone: this.maskPhone(phone),
    };
  }

  private maskPhone(phone: string) {
    const formatted = formatPhoneNumber(phone);
    const digits = formatted.replace(/\D/g, '');
    const keep = digits.slice(-4);
    if (!keep) return formatted;

    let seen = 0;
    const total = digits.length;
    let keepIndex = total - 4;

    return formatted.replace(/\d/g, () => {
      const current = seen;
      seen += 1;
      return current < keepIndex ? '*' : digits[current];
    });
  }
}
