import { TokenService } from '@app/shared/services';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LogoutUseCase {
  constructor(private readonly tokenService: TokenService) {}

  async execute({ refreshToken }: { refreshToken?: string }) {
    await this.tokenService.revokeByRefreshToken(refreshToken);

    return;
  }
}
