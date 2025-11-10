import { PrismaService } from '@app/shared';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import { RegisterPushTokenDto } from '../dto/requests/register-push-token.dto';

@Injectable()
export class RegisterPushTokenUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async execute(
    body: RegisterPushTokenDto,
    currentUser?: CurrentUser,
    headerDeviceToken?: string,
  ) {
    const { push_token } = body;

    // If logged in, update User.push_token and clear cache if changed
    if (currentUser?.id) {
      if (currentUser.push_token && currentUser.push_token === push_token) return;

      await Promise.all([
        this.prisma.user.update({
          where: { id: currentUser.id },
          data: { push_token },
        }),
        this.redis.clearCurrentUserCustomerFromRequest({ userId: currentUser.id }),
      ]);
      return;
    }

    // If guest (no current user), update Guest.push_token using header device-token
    if (headerDeviceToken) {
      await this.prisma.guest
        .update({ where: { device_token: headerDeviceToken }, data: { push_token } })
        .catch(() => void 0);
    }

    return;
  }
}

