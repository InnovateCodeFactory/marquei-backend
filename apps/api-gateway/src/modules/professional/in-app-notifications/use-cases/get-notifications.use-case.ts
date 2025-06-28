import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatDateDistanceToNow } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetNotificationsUseCase {
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

    if (!professionalProfile) {
      throw new Error('Perfil profissional não encontrado');
    }

    const notifications = await this.prismaService.inAppNotification.findMany({
      where: {
        professionalProfileId: professionalProfile.id,
        is_visible: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        title: true,
        message: true,
        read: true,
        created_at: true,
      },
    });

    return (
      notifications?.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        created_at: notification.created_at,
        created_at_formatted: formatDateDistanceToNow(notification.created_at),
      })) || []
    );
  }
}
