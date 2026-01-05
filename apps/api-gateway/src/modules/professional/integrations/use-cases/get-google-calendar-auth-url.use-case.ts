import { GoogleCalendarService } from '@app/shared/modules/google-calendar/google-calendar.service';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { AppRequest } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class GetGoogleCalendarAuthUrlUseCase {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly redis: RedisService,
  ) {}

  private readonly stateTtlSeconds = 10 * 60;
  private readonly statePrefix = 'oauth:google:state:';

  async execute(req: AppRequest): Promise<{ url: string }> {
    const user = req.user;
    const body = (req.body || {}) as { returnTo?: string | null };

    const statePayload = {
      userId: user?.id ?? null,
      currentBusinessId: user?.current_selected_business_id ?? null,
      returnTo: body.returnTo ?? null,
    };

    const state = randomUUID();
    await this.redis.set({
      key: `${this.statePrefix}${state}`,
      value: JSON.stringify(statePayload),
      ttlInSeconds: this.stateTtlSeconds,
    });

    const url = this.googleCalendarService.generateAuthUrl({
      state,
    });

    return { url };
  }
}
