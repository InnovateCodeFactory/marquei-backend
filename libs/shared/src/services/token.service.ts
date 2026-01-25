import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { EnvSchemaType } from '../environment';
import { RedisService } from '../modules/redis/redis.service';
import { HashingService } from './hashing.service';

type UserType = 'PROFESSIONAL' | 'CUSTOMER';

interface JwtPayloadBase {
  id: string;
  user_type: UserType;
}

const REFRESH_LOCK_TTL_SEC = 5; // tempo curto o suficiente para uma rotação
const ROTATE_LOCKED_ERROR = 'ROTATE_LOCKED_TRY_AGAIN';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvSchemaType>,
    private readonly hashing: HashingService,
    private readonly redis: RedisService,
  ) {}

  private parseDurationToSeconds(
    input: string | undefined,
  ): number | undefined {
    if (!input) return undefined;
    const trimmed = input.trim();
    const match = trimmed.match(/^(\d+)([smhd])?$/i);
    if (!match) return undefined;
    const value = parseInt(match[1], 10);
    const unit = (match[2] || 's').toLowerCase();
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return undefined;
    }
  }

  private get accessExpiresIn(): string {
    return this.config.get('JWT_ACCESS_EXPIRES_IN') || '15m';
  }

  private get refreshExpiresIn(): string {
    return this.config.get('JWT_REFRESH_EXPIRES_IN') || '30d';
  }

  private get accessSecret(): string {
    return this.config.getOrThrow('JWT_SECRET');
  }

  private get refreshSecret(): string {
    return this.config.get('JWT_REFRESH_SECRET') || this.accessSecret;
  }

  async signAccessToken(payload: any): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn as any,
    });
  }

  private getRefreshKey(jti: string): string {
    return `refresh:${jti}`;
  }

  private getUserSetKey(userId: string): string {
    return `refresh:user:${userId}`;
  }

  private getRefreshLockKey(jti: string): string {
    return `lock:refresh:${jti}`;
  }

  /** Tenta adquirir lock para este jti. Retorna lockId se conseguir, senão null. */
  private async acquireJtiLock(jti: string): Promise<string | null> {
    const lockId = randomUUID();
    const ok = await this.redis.setNx({
      key: this.getRefreshLockKey(jti),
      value: lockId,
      ttlInSeconds: REFRESH_LOCK_TTL_SEC,
    });
    return ok ? lockId : null;
  }

  /** Libera o lock somente se ainda for do mesmo dono (lockId). */
  private async releaseJtiLock(jti: string, lockId: string): Promise<void> {
    const key = this.getRefreshLockKey(jti);
    try {
      // WATCH: se o valor mudar entre GET e EXEC, o EXEC falha (retorna null)
      await (this.redis as any).watch(key);
      const current = await this.redis.get({ key });
      if (current === lockId) {
        const tx = (this.redis as any).multi();
        tx.del(key);
        await tx.exec(); // se alguém alterar o key no meio, retorna null e não deleta
      }
    } catch {
      // best-effort fallback: tenta apagar (lock tem TTL curto de qualquer forma)
      try {
        await this.redis.del({ key });
      } catch {}
    } finally {
      try {
        await (this.redis as any).unwatch();
      } catch {}
    }
  }

  async signAndStoreRefreshToken(payload: JwtPayloadBase): Promise<string> {
    const jti = randomUUID();
    const token = await this.jwtService.signAsync(
      { ...payload, jti },
      { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn as any },
    );

    const ttl = this.parseDurationToSeconds(this.refreshExpiresIn);
    const key = this.getRefreshKey(jti);
    const hash = await this.hashing.hash(token);
    const value = JSON.stringify({
      userId: payload.id,
      user_type: payload.user_type,
      hash,
    });
    await this.redis.set({ key, value, ...(ttl ? { ttlInSeconds: ttl } : {}) });
    await this.redis.sadd({ key: this.getUserSetKey(payload.id), member: jti });
    return token;
  }

  async issueTokenPair(
    payload: JwtPayloadBase,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signAndStoreRefreshToken(payload),
    ]);

    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    payload: JwtPayloadBase;
  }> {
    let decoded: any;
    try {
      decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new Error('Invalid or expired refresh token');
    }

    const { id, user_type, jti } = decoded as JwtPayloadBase & { jti: string };
    if (!jti || !id || !user_type)
      throw new Error('Invalid refresh token payload');

    // -------- LOCK POR JTI (evita rotação concorrente do mesmo refresh) --------
    const lockId = await this.acquireJtiLock(jti);
    if (!lockId) {
      throw new Error(ROTATE_LOCKED_ERROR); // trate como retryable no controller
    }
    // ---------------------------------------------------------------------------

    try {
      const key = this.getRefreshKey(jti);
      const stored = await this.redis.get({ key });
      if (!stored) throw new Error('Refresh token not found');

      const parsed: { userId: string; user_type: UserType; hash: string } =
        JSON.parse(stored);

      const matches = await this.hashing.compare(refreshToken, parsed.hash);
      if (!matches || parsed.userId !== id) {
        // Reuse/mismatch => revoga TUDO do usuário (defesa forte)
        await this.revokeAllForUser(id);
        throw new Error('Refresh token reuse detected');
      }

      // ROTATION: remove o antigo e emite novo par
      await this.redis.del({ key });
      await this.redis.srem({ key: this.getUserSetKey(id), member: jti });

      const payload: JwtPayloadBase = { id, user_type };
      const { accessToken, refreshToken: newRt } =
        await this.issueTokenPair(payload);
      return { accessToken, refreshToken: newRt, payload };
    } finally {
      await this.releaseJtiLock(jti, lockId).catch(() => {});
    }
  }

  async revokeByRefreshToken(refreshToken: string): Promise<void> {
    let decoded: any;
    try {
      decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      return; // already invalid
    }
    const { id, jti } = decoded as { id: string; jti: string };
    if (!jti) return;
    await this.redis.del({ key: this.getRefreshKey(jti) });
    if (id) await this.redis.srem({ key: this.getUserSetKey(id), member: jti });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const setKey = this.getUserSetKey(userId);
    const members = await this.redis.smembers({ key: setKey });
    for (const jti of members) {
      await this.redis.del({ key: this.getRefreshKey(jti) });
      await this.redis.srem({ key: setKey, member: jti });
    }
  }
}
