import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import { GetRatingPromptDto } from '../dto/get-rating-prompt.dto';

@Injectable()
export class GetRatingPromptUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRatingPromptDto, req: AppRequest) {
    const business_slug = query?.business_slug?.trim();
    const user = req.user;

    if (!business_slug || !user?.id || user.user_type !== 'CUSTOMER') {
      return { should_prompt: false, reason: 'not_customer' };
    }

    if (!user.personId) {
      return { should_prompt: false, reason: 'missing_person' };
    }

    const [completedAppointment, existingRating, dismissedPrompt] =
      await Promise.all([
        this.prisma.$queryRaw<{ exists: number }[]>`
          SELECT 1 as exists
          FROM "Appointment" a
          JOIN "Service" s ON a."service_id" = s.id
          JOIN "Business" b ON s."businessId" = b.id
          WHERE a."personId" = ${user.personId}
            AND a."status" = 'COMPLETED'
            AND b."slug" = ${business_slug}
          LIMIT 1
        `,
        this.prisma.businessRating.findFirst({
          where: { business_slug, userId: user.id },
          select: { id: true },
        }),
        this.prisma.businessRatingPrompt.findFirst({
          where: {
            business_slug,
            userId: user.id,
            dismissed_at: { not: null },
          },
          orderBy: { dismissed_at: 'desc' },
          select: { dismissed_at: true },
        }),
      ]);

    if (!completedAppointment?.length) {
      return { should_prompt: false, reason: 'no_completed_appointments' };
    }

    if (existingRating) {
      return { should_prompt: false, reason: 'already_rated' };
    }

    if (dismissedPrompt?.dismissed_at) {
      const thirtyDaysMs = 1000 * 60 * 60 * 24 * 30;
      const dismissedAt = dismissedPrompt.dismissed_at.getTime();
      if (Date.now() - dismissedAt < thirtyDaysMs) {
        return { should_prompt: false, reason: 'dismissed' };
      }
    }

    return { should_prompt: true };
  }
}
