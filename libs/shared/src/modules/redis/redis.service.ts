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
    userId,
  }: {
    userId: string;
  }): Promise<CachedUserProps | null> {
    const cachedKey = `user:${userId}`;

    const userInCache = await this.get({ key: cachedKey });

    if (userInCache) return JSON.parse(userInCache);

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        user_type: true,
        id: true,
        CurrentSelectedBusiness: {
          select: {
            business: {
              select: {
                slug: true,
                id: true,
                BusinessSubscription: {
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

  async clearCurrentUserFromRequest({ userId }: { userId: string }) {
    const cachedKey = `user:${userId}`;
    return this.del({ key: cachedKey });
  }
}
