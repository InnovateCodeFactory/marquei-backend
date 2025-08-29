import { Injectable, BadRequestException } from '@nestjs/common';
import { TokenService } from '@app/shared/services';
import { RefreshTokenDto } from '../dto/requests/refresh-token.dto';

@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly tokenService: TokenService) {}

  async execute(dto: RefreshTokenDto) {
    try {
      const { accessToken, refreshToken } = await this.tokenService.rotateRefreshToken(dto.refreshToken);
      return { token: accessToken, refresh_token: refreshToken };
    } catch (e) {
      throw new BadRequestException(e?.message || 'Invalid refresh token');
    }
  }
}

