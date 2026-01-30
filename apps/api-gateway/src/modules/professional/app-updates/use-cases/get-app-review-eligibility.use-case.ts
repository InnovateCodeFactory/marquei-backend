import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';

export type ReviewEligibilityResult = {
  should_open_modal: boolean;
};

@Injectable()
export class GetAppReviewEligibilityUseCase {
  private static readonly COOLDOWN_DAYS = 30;

  constructor(private readonly prisma: PrismaService) {}

  async execute(user: CurrentUser): Promise<ReviewEligibilityResult> {
    if (!user?.id) return { should_open_modal: false };

    const current = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { app_review_eligible: true },
    });

    if (!current?.app_review_eligible) {
      return { should_open_modal: false };
    }

    const cutoff = new Date(
      Date.now() -
        GetAppReviewEligibilityUseCase.COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
    );

    const recent = await this.prisma.appReviewEvent.findFirst({
      where: {
        user_id: user.id,
        event: { in: ['PROMPT_SHOWN', 'STORE_OPENED'] },
        created_at: { gte: cutoff },
      },
      select: { id: true },
      orderBy: { created_at: 'desc' },
    });

    return { should_open_modal: !recent };
  }
}
