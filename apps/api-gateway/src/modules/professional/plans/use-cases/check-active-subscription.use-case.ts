import { PrismaService } from '@app/shared';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class CheckActiveSubscriptionUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(currentUser: {
    current_selected_business_slug: string;
    id: string;
  }) {
    if (!currentUser?.current_selected_business_slug)
      throw new UnauthorizedException(
        'Você não possui uma empresa selecionada',
      );

    const business = await this.prismaService.business.findFirst({
      where: {
        slug: currentUser.current_selected_business_slug,
        // ownerId: currentUser.id,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!business)
      throw new UnauthorizedException(
        'Você não tem permissão para acessar este negócio',
      );

    const now = new Date();

    // Check if business already has an active subscription in our DB
    const activeLocalSub =
      await this.prismaService.businessSubscription.findFirst({
        where: {
          businessId: business.id,
          status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
          current_period_end: {
            gt: now,
          },
          // plan: {
          //   billing_period: { not: 'FREE_TRIAL' },
          // },
        },
        select: { id: true },
      });

    return {
      has_active_subscription: !!activeLocalSub,
      is_user_owner: business.ownerId === currentUser.id,
      // is_user_owner: true,
    };
  }
}
