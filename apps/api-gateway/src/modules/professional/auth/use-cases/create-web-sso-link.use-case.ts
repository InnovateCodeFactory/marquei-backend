import { RedisService } from '@app/shared/modules/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { EnvSchemaType } from '@app/shared/environment';
import {
  WEB_SSO_CODE_TTL_SECONDS,
  buildWebSsoRedisKey,
  getDefaultWebPortalUrl,
  normalizeWebPortalReturnTo,
} from './web-sso.utils';

type CreateWebSsoLinkInput = {
  userId: string;
  consumeUrl: string;
  returnTo?: string | null;
};

type WebSsoPayload = {
  userId: string;
  returnTo: string;
  issuedAt: string;
};

@Injectable()
export class CreateWebSsoLinkUseCase {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService<EnvSchemaType>,
  ) {}

  async execute({
    userId,
    consumeUrl,
    returnTo,
  }: CreateWebSsoLinkInput): Promise<{
    sso_url: string;
    expires_in_seconds: number;
  }> {
    const resolvedReturnTo =
      normalizeWebPortalReturnTo({
        value: returnTo,
        config: this.configService,
      }) || getDefaultWebPortalUrl(this.configService);

    const code = randomBytes(32).toString('hex');
    const redisKey = buildWebSsoRedisKey(code);

    const payload: WebSsoPayload = {
      userId,
      returnTo: resolvedReturnTo,
      issuedAt: new Date().toISOString(),
    };

    await this.redisService.set({
      key: redisKey,
      value: JSON.stringify(payload),
      ttlInSeconds: WEB_SSO_CODE_TTL_SECONDS,
    });

    const consumeLink = new URL(consumeUrl);
    consumeLink.searchParams.set('code', code);

    return {
      sso_url: consumeLink.toString(),
      expires_in_seconds: WEB_SSO_CODE_TTL_SECONDS,
    };
  }
}
