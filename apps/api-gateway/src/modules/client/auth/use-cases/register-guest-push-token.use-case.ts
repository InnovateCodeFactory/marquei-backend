import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { RegisterPushTokenDto } from '../dto/requests/register-push-token.dto';

@Injectable()
export class RegisterGuestPushTokenUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(body: RegisterPushTokenDto, headerDeviceToken?: string) {
    const { push_token } = body;
    if (!headerDeviceToken) return; // nothing to do without device token

    await this.prisma.guest
      .update({ where: { device_token: headerDeviceToken }, data: { push_token } })
      .catch(() => void 0);

    return;
  }
}

