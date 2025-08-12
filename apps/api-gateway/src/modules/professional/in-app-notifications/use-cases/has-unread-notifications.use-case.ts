import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class HasUnreadNotificationsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(user: CurrentUser) {
    const professionalProfile =
      await this.prismaService.professionalProfile.findFirst({
        where: {
          userId: user.id,
          business_id: user.current_selected_business_id,
        },
        select: {
          id: true,
        },
      });

    if (!professionalProfile)
      throw new NotFoundException('Perfil profissional não encontrado');

    const unreadNotifications =
      await this.prismaService.inAppNotification.count({
        where: {
          professionalProfileId: professionalProfile.id,
          read: false,
        },
      });

    return {
      has_unread_notifications: unreadNotifications > 0,
    };
  }
}
