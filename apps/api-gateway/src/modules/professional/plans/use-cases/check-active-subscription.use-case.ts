import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class CheckActiveSubscriptionUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_slug)
      throw new UnauthorizedException(
        'Você não possui uma empresa selecionada',
      );

    const business = await this.prismaService.business.findFirst({
      where: {
        slug: currentUser.current_selected_business_slug,
        ownerId: currentUser.id,
      },
      select: {
        id: true,
      },
    });

    if (!business)
      throw new UnauthorizedException(
        'Você não tem permissão para acessar este negócio',
      );

    // Check if business already has an active subscription in our DB
    const activeLocalSub =
      await this.prismaService.businessSubscription.findFirst({
        where: {
          businessId: business.id,
          status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
        },
        select: { id: true },
      });

    return { has_active_subscription: !!activeLocalSub };
  }
}
