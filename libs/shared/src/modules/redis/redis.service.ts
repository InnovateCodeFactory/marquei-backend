import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.provider';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

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
}
