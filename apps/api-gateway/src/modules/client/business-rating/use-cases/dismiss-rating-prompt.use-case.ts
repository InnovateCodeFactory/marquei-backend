import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import { DismissRatingPromptDto } from '../dto/dismiss-rating-prompt.dto';

@Injectable()
export class DismissRatingPromptUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: DismissRatingPromptDto, req: AppRequest) {
    const business_slug = dto?.business_slug?.trim();
    const user = req.user;

    if (!business_slug || !user?.id || user.user_type !== 'CUSTOMER') {
      return null;
    }

    await this.prisma.businessRatingPrompt.create({
      data: {
        business_slug,
        userId: user.id,
        dismissed_at: new Date(),
      },
      select: { id: true },
    });

    return null;
  }
}
