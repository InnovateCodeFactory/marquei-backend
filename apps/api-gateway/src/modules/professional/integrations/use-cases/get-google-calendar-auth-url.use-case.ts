import { GoogleCalendarService } from '@app/shared/modules/google-calendar/google-calendar.service';
import { AppRequest } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetGoogleCalendarAuthUrlUseCase {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async execute(req: AppRequest): Promise<{ url: string }> {
    const user = req.user;

    const statePayload = {
      userId: user?.id ?? null,
      currentBusinessId: user?.current_selected_business_id ?? null,
    };

    const state = Buffer.from(
      JSON.stringify(statePayload),
      'utf-8',
    ).toString('base64url');

    const url = this.googleCalendarService.generateAuthUrl({
      state,
    });

    return { url };
  }
}

