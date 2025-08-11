import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class HasUnreadNotificationsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(user: CurrentUser) {
    const professionalProfile = await this.prisma.professionalProfile.findFirst(
      {
        where: {
          business_id: user.current_selected_business_id,
          person: {
            personAccount: {
              authAccountId: user.id,
            },
          },
        },
        select: { id: true },
      },
    );

    if (!professionalProfile) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    const unread = await this.prisma.inAppNotification.count({
      where: {
        professionalProfileId: professionalProfile.id,
        read: false,
        // opcional: is_visible: true,
      },
    });

    return { has_unread_notifications: unread > 0 };
  }
}
