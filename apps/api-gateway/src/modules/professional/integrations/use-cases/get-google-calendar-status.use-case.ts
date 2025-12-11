import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetGoogleCalendarStatusUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(req: AppRequest): Promise<{
    connected: boolean;
  }> {
    const userId = req.user?.id;
    if (!userId) {
      return { connected: false };
    }

    const integration = await this.prisma.userIntegration.findUnique({
      where: {
        id: `${userId}_GOOGLE_CALENDAR`,
      },
      select: {
        id: true,
      },
    });

    return {
      connected: !!integration,
    };
  }
}
