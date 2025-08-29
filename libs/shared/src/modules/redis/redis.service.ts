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

  async expire({
    key,
    ttlInSeconds,
  }: {
    key: string;
    ttlInSeconds: number;
  }): Promise<number> {
    return this.redis.expire(key, ttlInSeconds);
  }

  /** SET NX EX — retorna true se lock adquirido */
  async setNx({
    key,
    value,
    ttlInSeconds,
  }: {
    key: string;
    value: string;
    ttlInSeconds: number;
  }): Promise<boolean> {
    const ttl = Math.max(1, Math.floor(ttlInSeconds)); // inteiro >= 1
    // Usa "call" para evitar sobrecarga de tipos do ioredis
    const res = await (this.redis as any).call(
      'SET',
      key,
      value,
      'NX',
      'EX',
      ttl.toString(),
    );
    return res === 'OK';
  }

  async watch(keys: string | string[]): Promise<void> {
    await this.redis.watch(...(Array.isArray(keys) ? keys : [keys]));
  }

  async unwatch(): Promise<void> {
    await this.redis.unwatch();
  }

  multi() {
    return this.redis.multi();
  }

  /** Execução de script Lua genérico (usado para liberar lock com check-and-del) */
  async evalLua<T = any>({
    script,
    keys = [],
    args = [],
  }: {
    script: string;
    keys?: string[];
    args?: (string | number)[];
  }): Promise<T> {
    // Evita quebras/indentação que às vezes geram erro
    const clean = script.replace(/\s+/g, ' ').trim();
    return (this.redis.eval as any)(clean, keys.length, ...keys, ...args) as T;
  }

  // ----------------- Set operations helpers (refresh tracking) -----------------
  async sadd({
    key,
    member,
  }: {
    key: string;
    member: string;
  }): Promise<number> {
    return this.redis.sadd(key, member);
  }

  async smembers({ key }: { key: string }): Promise<string[]> {
    return this.redis.smembers(key);
  }

  async srem({
    key,
    member,
  }: {
    key: string;
    member: string;
  }): Promise<number> {
    return this.redis.srem(key, member);
  }
  // ---------------------------------------------------------------------------

  async getCurrentUserProfessionalFromRequest({
    userId,
  }: {
    userId: string;
  }): Promise<CachedUserProps | null> {
    const cachedKey = `user:professional:${userId}`;

    const userInCache = await this.get({ key: cachedKey });

    if (userInCache) return JSON.parse(userInCache);

    const user = await this.prismaService.user.findUnique({
      where: { id: userId, user_type: 'PROFESSIONAL' },
      select: {
        user_type: true,
        id: true,
        push_token: true,
        CurrentSelectedBusiness: {
          select: {
            business: {
              select: {
                slug: true,
                id: true,

                BusinessSubscription: {
                  orderBy: {
                    created_at: 'desc',
                  },
                  take: 1,
                  where: {
                    status: {
                      in: ['ACTIVE', 'PAST_DUE', 'UNPAID'],
                    },
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

    if (user) {
      await this.set({
        key: cachedKey,
        value: JSON.stringify(user),
        ttlInSeconds: 60 * 60 * 24, // 1 day
      });

      return user;
    }

    return null;
  }

  async clearCurrentUserProfessionalFromRequest({
    userId,
  }: {
    userId: string;
  }) {
    const cachedKey = `user:professional:${userId}`;
    return this.del({ key: cachedKey });
  }

  async getCurrentUserCustomerFromRequest({
    userId,
  }: {
    userId: string;
  }): Promise<{
    user_type: string;
    id: string;
    push_token?: string | null;
    personId?: string;
  } | null> {
    const cachedKey = `user:customer:${userId}`;

    const userInCache = await this.get({ key: cachedKey });

    if (userInCache) return JSON.parse(userInCache);

    const user = await this.prismaService.user.findUnique({
      where: { id: userId, user_type: 'CUSTOMER' },
      select: {
        user_type: true,
        id: true,
        push_token: true,
        personId: true,
      },
    });

    if (user) {
      await this.set({
        key: cachedKey,
        value: JSON.stringify(user),
        ttlInSeconds: 60 * 60 * 24, // 1 day
      });

      return user;
    }

    return null;
  }

  async clearCurrentUserCustomerFromRequest({ userId }: { userId: string }) {
    const cachedKey = `user:customer:${userId}`;
    return this.del({ key: cachedKey });
  }
}
