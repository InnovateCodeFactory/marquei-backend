import { PrismaService } from '@app/shared';
import { GoogleCalendarService } from '@app/shared/modules/google-calendar/google-calendar.service';
import { Injectable, Logger } from '@nestjs/common';

type GoogleCallbackState = {
  userId: string | null;
  currentBusinessId: string | null;
  returnTo?: string | null;
};

@Injectable()
export class GoogleCalendarCallbackUseCase {
  private readonly logger = new Logger(GoogleCalendarCallbackUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
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
      const json = Buffer.from(state, 'base64url').toString('utf-8');
      payload = JSON.parse(json) as GoogleCallbackState;
    } catch (error) {
      this.logger.error('Falha ao decodificar state do Google', error as any);
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

    return { ok: true, returnTo: payload.returnTo ?? null };
  }
}
