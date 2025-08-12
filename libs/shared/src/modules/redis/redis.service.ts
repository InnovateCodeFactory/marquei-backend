import { CachedUserProps } from '@app/shared/types/cached-user.types';
import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PrismaService } from '../database/database.service';
import { REDIS_CLIENT } from './redis.provider';

@Injectable()
export class RedisService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prismaService: PrismaService,
  ) {}

  async set({
    key,
    value,
    ttlInSeconds,
  }: {
    key: string;
    value: string;
    ttlInSeconds?: number;
  }): Promise<void> {
    if (ttlInSeconds) {
      await this.redis.set(key, value, 'EX', ttlInSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  async get({ key }: { key: string }): Promise<string | null> {
    return this.redis.get(key);
  }

  async del({ key }: { key: string }): Promise<number> {
    return this.redis.del(key);
  }

  async exists({ key }: { key: string }): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async getCurrentUserFromRequest({
    accountId, // agora é o id da AuthAccount
  }: {
    accountId: string;
  }): Promise<CachedUserProps | null> {
    const cachedKey = `account:${accountId}`; // antes era user: -> mude a chave pra refletir a nova entidade

    const userInCache = await this.get({ key: cachedKey });
    if (userInCache) return JSON.parse(userInCache);

    const account = await this.prismaService.authAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        // se quiser expor firstAccess/isActive, adicione aqui
        CurrentSelectedBusiness: {
          select: {
            business: {
              select: {
                id: true,
                slug: true,
                BusinessSubscription: {
                  orderBy: { created_at: 'desc' },
                  take: 1,
                  where: {
                    status: { in: ['ACTIVE', 'PAST_DUE', 'UNPAID'] },
                  },
                  select: {
                    status: true,
                    plan: {
                      select: {
                        name: true,
                        billing_period: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (account) {
      await this.set({
        key: cachedKey,
        value: JSON.stringify(account),
        ttlInSeconds: 60 * 60 * 24, // 1 day
      });
      return account as unknown as CachedUserProps;
    }

    return null;
  }

  async clearCurrentUserFromRequest({ accountId }: { accountId: string }) {
    const cachedKey = `account:${accountId}`;
    return this.del({ key: cachedKey });
  }
}
