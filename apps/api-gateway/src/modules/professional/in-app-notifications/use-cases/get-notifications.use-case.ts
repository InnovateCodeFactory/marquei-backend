import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatDateDistanceToNow } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';
import { GetNotificationsDto } from '../dto/get-notifications.dto';

@Injectable()
export class GetNotificationsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(user: CurrentUser, query?: GetNotificationsDto) {
    const page = Number.parseInt(String(query?.page ?? 1), 10) || 1;
    const limit = Number.parseInt(String(query?.limit ?? 25), 10) || 25;
    const skip = (page - 1) * limit;
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

    const [notifications, total] = await Promise.all([
      this.prismaService.inAppNotification.findMany({
        where: {
          professionalProfileId: professionalProfile.id,
          is_visible: true,
        },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          title: true,
          message: true,
          read: true,
          created_at: true,
        },
        skip,
        take: limit,
      }),
      this.prismaService.inAppNotification.count({
        where: {
          professionalProfileId: professionalProfile.id,
          is_visible: true,
        },
      }),
    ]);

    const items = notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      created_at: notification.created_at,
      created_at_formatted: formatDateDistanceToNow(notification.created_at),
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasMorePages = page < totalPages;

    return {
      notifications: items,
      page,
      limit,
      totalCount: total,
      totalPages,
      hasMorePages,
    };
  }
}
