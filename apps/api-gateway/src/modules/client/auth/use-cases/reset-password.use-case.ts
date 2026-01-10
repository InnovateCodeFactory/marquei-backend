import { PrismaService } from '@app/shared';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { CachedKeys } from '@app/shared/utils/cached-keys';
import { HashingService } from '@app/shared/services';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ForgotPasswordResetDto } from '../dto/requests/forgot-password-reset.dto';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly hashingService: HashingService,
  ) {}

  async execute({ request_id, new_password }: ForgotPasswordResetDto) {
    const key = CachedKeys.CUSTOMER_PASSWORD_RESET({ request_id });
    const cached = await this.redisService.get({ key });

    if (!cached)
      throw new BadRequestException('Requisição inválida ou expirada');

    let parsed: { user_id?: string; validated?: boolean } | null = null;
    try {
      parsed = JSON.parse(cached);
    } catch {
      parsed = null;
    }

    if (!parsed?.user_id || !parsed?.validated)
      throw new BadRequestException('Requisição inválida ou expirada');

    const hashedPassword = await this.hashingService.hash(new_password);

    await this.prismaService.user.update({
      where: { id: parsed.user_id },
      data: { password: hashedPassword },
    });

    await this.redisService.del({ key });

    return null;
  }
}
