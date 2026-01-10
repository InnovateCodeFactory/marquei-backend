import { PrismaService } from '@app/shared';
import { GoogleCalendarService } from '@app/shared/modules/google-calendar/google-calendar.service';
import { AppRequest } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DisconnectGoogleCalendarUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async execute(req: AppRequest): Promise<{ ok: boolean }> {
    const userId = req.user?.id;
    if (!userId) {
      return { ok: false };
    }

    const integration = await this.prisma.userIntegration.findUnique({
      where: {
        id: `${userId}_GOOGLE_CALENDAR`,
      },
      select: {
        access_token: true,
        refresh_token: true,
        raw_tokens: true,
      },
    });

    if (integration) {
      const rawTokens = (integration.raw_tokens ?? {}) as Record<
        string,
        unknown
      >;
      await this.googleCalendarService.revokeTokens({
        access_token:
          integration.access_token ??
          (rawTokens.access_token as string | null | undefined),
        refresh_token:
          integration.refresh_token ??
          (rawTokens.refresh_token as string | null | undefined),
      });
    }

    await this.prisma.userIntegration.deleteMany({
      where: {
        id: `${userId}_GOOGLE_CALENDAR`,
      },
    });

    return { ok: true };
  }
}
