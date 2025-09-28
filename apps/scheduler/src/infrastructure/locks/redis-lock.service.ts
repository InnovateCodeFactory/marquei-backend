import { RedisService } from '@app/shared/modules/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

type AcquireOpts = {
  key: string; // ex.: "lock:close-due:2025-09-21T15:04"
  ttlInSeconds: number; // tempo de vida do lock
};

type AcquireWaitOpts = AcquireOpts & {
  maxWaitMs?: number; // tempo total tentando adquirir
  retryDelayMs?: number; // delay base entre tentativas
  jitterMs?: number; // jitter aleatório p/ evitar thundering herd
};

type RedisLockHandle = {
  key: string;
  token: string;
  /** renova o TTL se ainda formos donos do lock */
  renew(ttlInSeconds: number): Promise<boolean>;
  /** libera o lock somente se o token bater */
  release(): Promise<boolean>;
};

const LUA_RELEASE = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

const LUA_RENEW = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("EXPIRE", KEYS[1], ARGV[2])
  else
    return 0
  end
`;

@Injectable()
export class RedisLockService {
  constructor(private readonly redis: RedisService) {}

  /**
   * Tenta adquirir o lock uma única vez (não bloqueante).
   */
  async tryAcquire({
    key,
    ttlInSeconds,
  }: AcquireOpts): Promise<RedisLockHandle | null> {
    const token = randomUUID();

    const ok = await this.redis.setNx({
      key,
      value: token,
      ttlInSeconds, // usa SET NX EX <ttl>
    });

    if (!ok) return null;

    return this.buildHandle(key, token);
  }

  /**
   * Tenta adquirir o lock com retries até maxWaitMs (bloqueante).
   */
  async acquire({
    key,
    ttlInSeconds,
    maxWaitMs = 5_000,
    retryDelayMs = 100,
    jitterMs = 50,
  }: AcquireWaitOpts): Promise<RedisLockHandle | null> {
    const deadline = Date.now() + maxWaitMs;

    while (true) {
      const handle = await this.tryAcquire({ key, ttlInSeconds });
      if (handle) return handle;

      const now = Date.now();
      if (now >= deadline) return null;

      const jitter = Math.floor(Math.random() * (jitterMs + 1));
      const delay = Math.min(retryDelayMs + jitter, deadline - now);
      await new Promise((r) => setTimeout(r, Math.max(1, delay)));
    }
  }

  /**
   * Executa uma função dentro de um lock (adquire -> run -> release).
   * Retorna o resultado de `fn`. Se não conseguir lock, retorna null (ou lance erro, se preferir).
   */
  async withLock<T>(
    opts: AcquireWaitOpts,
    fn: (h: RedisLockHandle) => Promise<T>,
  ): Promise<T | null> {
    const handle = await this.acquire(opts);
    if (!handle) return null;

    try {
      return await fn(handle);
    } finally {
      await handle.release().catch(() => void 0);
    }
  }

  // ------------------------ private helpers ------------------------

  private buildHandle(key: string, token: string): RedisLockHandle {
    return {
      key,
      token,
      renew: async (ttlInSeconds: number) => {
        const res = await this.redis.evalLua<number>({
          script: LUA_RENEW,
          keys: [key],
          args: [token, ttlInSeconds],
        });
        return res === 1;
      },
      release: async () => {
        const res = await this.redis.evalLua<number>({
          script: LUA_RELEASE,
          keys: [key],
          args: [token],
        });
        return res === 1;
      },
    };
  }
}
