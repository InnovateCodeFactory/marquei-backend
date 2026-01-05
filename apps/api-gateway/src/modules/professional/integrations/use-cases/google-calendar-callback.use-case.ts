import { PrismaService } from '@app/shared';
import { GoogleCalendarService } from '@app/shared/modules/google-calendar/google-calendar.service';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { EnvSchemaType } from '@app/shared/environment';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type GoogleCallbackState = {
  userId: string | null;
  currentBusinessId: string | null;
  returnTo?: string | null;
};

@Injectable()
export class GoogleCalendarCallbackUseCase {
  private readonly logger = new Logger(GoogleCalendarCallbackUseCase.name);
  private readonly statePrefix = 'oauth:google:state:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly redis: RedisService,
    private readonly config: ConfigService<EnvSchemaType>,
  ) {}

  async execute(params: {
    code?: string;
    state?: string;
  }): Promise<{ ok: boolean; returnTo?: string | null }> {
    const { code, state } = params;

    if (!code || !state) {
      this.logger.warn('Google callback sem code ou state');
      return { ok: false };
    }

    let payload: GoogleCallbackState | null = null;
    try {
      const key = `${this.statePrefix}${state}`;
      const stored = await this.redis.get({ key });
      if (!stored) {
        this.logger.warn('State do Google nao encontrado ou expirado');
        return { ok: false };
      }
      await this.redis.del({ key });
      payload = JSON.parse(stored) as GoogleCallbackState;
    } catch (error) {
      this.logger.error('Falha ao validar state do Google', error as any);
      return { ok: false };
    }

    if (!payload?.userId) {
      this.logger.warn('State do Google sem userId');
      return { ok: false };
    }

    const userId = payload.userId;

    // 1) Trocar o code pelos tokens
    const tokens = await this.googleCalendarService.exchangeCodeForTokens(code);

    // 2) Persistir/atualizar integração do usuário
    await this.prisma.userIntegration.upsert({
      where: {
        id: `${userId}_GOOGLE_CALENDAR`,
      },
      create: {
        id: `${userId}_GOOGLE_CALENDAR`,
        userId,
        provider: 'GOOGLE_CALENDAR',
        access_token: tokens.access_token ?? null,
        refresh_token: tokens.refresh_token ?? null,
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? null,
        expiry_date: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        raw_tokens: tokens as any,
      },
      update: {
        access_token: tokens.access_token ?? null,
        refresh_token: tokens.refresh_token ?? null,
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? null,
        expiry_date: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        raw_tokens: tokens as any,
        updated_at: new Date(),
      },
    });

    this.logger.log(
      `Google Calendar integrado com sucesso para userId=${userId}`,
    );

    const safeReturnTo = this.normalizeReturnTo(payload.returnTo);
    return { ok: true, returnTo: safeReturnTo ?? null };
  }

  private normalizeReturnTo(value?: string | null): string | null {
    if (!value) return null;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (url.protocol !== 'https:') return null;
    const allowedOrigins = this.getAllowedOrigins();
    if (!allowedOrigins.size) return null;
    if (!allowedOrigins.has(url.origin)) return null;
    return url.toString();
  }

  private getAllowedOrigins(): Set<string> {
    const raw = this.config.get('WEB_APP_ORIGINS') || '';
    const origins = raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    return new Set(origins);
  }
}
