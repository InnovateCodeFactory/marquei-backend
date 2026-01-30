import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import { RegisterAppReviewEventDto } from '../dto/requests/register-app-review-event.dto';

@Injectable()
export class RegisterAppReviewEventUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: RegisterAppReviewEventDto, user: CurrentUser, meta?: { appVersion?: string }) {
    const normalizedEvent = dto.event.toUpperCase();
    const normalizedPlatform = dto.platform.toUpperCase();

    await this.prisma.appReviewEvent.create({
      data: {
        user_id: user?.id ?? null,
        device_id: dto.device_id ?? null,
        platform: normalizedPlatform as any,
        app_version: meta?.appVersion ?? null,
        event: normalizedEvent as any,
        context: dto.context ?? null,
      },
      select: { id: true },
    });

    return { success: true };
  }
}
