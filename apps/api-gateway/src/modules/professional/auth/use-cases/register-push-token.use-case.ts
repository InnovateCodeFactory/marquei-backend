import { PrismaService } from '@app/shared';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import { RegisterPushTokenDto } from '../dto/requests/register-push-token.dto';

@Injectable()
export class RegisterPushTokenUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async execute(body: RegisterPushTokenDto, currentUser: CurrentUser) {
    const { push_token } = body;

    if (currentUser?.push_token && push_token === currentUser.push_token)
      return;

    await Promise.all([
      this.prismaService.user.update({
        where: { id: currentUser.id },
        data: { push_token },
      }),
      this.redisService.clearCurrentUserProfessionalFromRequest({
        userId: currentUser.id,
      }),
    ]);

    return;
  }
}
