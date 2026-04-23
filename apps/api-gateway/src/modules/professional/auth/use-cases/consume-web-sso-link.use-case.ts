import { PrismaService } from '@app/shared';
import { EnvSchemaType } from '@app/shared/environment';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { TokenService } from '@app/shared/services';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildWebSsoRedisKey,
  getDefaultWebPortalUrl,
  normalizeWebPortalReturnTo,
} from './web-sso.utils';

type StoredWebSsoPayload = {
  userId: string;
  returnTo?: string;
  issuedAt?: string;
};

const GET_AND_DELETE_SCRIPT = `
  local value = redis.call('GET', KEYS[1])
  if not value then
    return nil
  end
  redis.call('DEL', KEYS[1])
  return value
`;

@Injectable()
export class ConsumeWebSsoLinkUseCase {
  constructor(
    private readonly redisService: RedisService,
    private readonly tokenService: TokenService,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService<EnvSchemaType>,
  ) {}

  async execute({ code }: { code: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    returnTo: string;
  }> {
    if (!/^[a-f0-9]{64}$/i.test(code)) {
      throw new BadRequestException('Código SSO inválido');
    }

    const redisKey = buildWebSsoRedisKey(code);
    const rawPayload = await this.redisService.evalLua<string | null>({
      script: GET_AND_DELETE_SCRIPT,
      keys: [redisKey],
    });

    if (!rawPayload) {
      throw new UnauthorizedException('Link SSO inválido ou expirado');
    }

    let payload: StoredWebSsoPayload;
    try {
      payload = JSON.parse(rawPayload) as StoredWebSsoPayload;
    } catch {
      throw new UnauthorizedException('Link SSO inválido ou expirado');
    }

    if (!payload?.userId) {
      throw new UnauthorizedException('Link SSO inválido ou expirado');
    }

    const user = await this.prismaService.user.findFirst({
      where: {
        id: payload.userId,
        user_type: 'PROFESSIONAL',
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não autorizado para SSO');
    }

    const { accessToken, refreshToken } = await this.tokenService.issueTokenPair({
      id: user.id,
      user_type: 'PROFESSIONAL',
    });

    const returnTo =
      normalizeWebPortalReturnTo({
        value: payload.returnTo,
        config: this.configService,
      }) || getDefaultWebPortalUrl(this.configService);

    return {
      accessToken,
      refreshToken,
      returnTo,
    };
  }
}
