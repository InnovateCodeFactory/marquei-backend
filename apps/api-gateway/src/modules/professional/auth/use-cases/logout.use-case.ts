import { Injectable } from '@nestjs/common';
import { TokenService } from '@app/shared/services';

@Injectable()
export class LogoutUseCase {
  constructor(private readonly tokenService: TokenService) {}

  async execute({ refreshToken, allDevices, userId }: { refreshToken?: string; allDevices?: boolean; userId?: string }) {
    if (allDevices && userId) {
      await this.tokenService.revokeAllForUser(userId);
      return { success: true };
    }
    if (refreshToken) {
      await this.tokenService.revokeByRefreshToken(refreshToken);
      return { success: true };
    }
    return { success: false };
  }
}

