import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatDateDistanceToNow } from '@app/shared/utils';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class GetNotificationsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(user: CurrentUser) {
    const professionalProfile = await this.prisma.professionalProfile.findFirst(
      {
        where: {
          business_id: user.current_selected_business_id,
          person: {
            personAccount: {
              authAccountId: user.id, // id da AuthAccount no JWT
            },
          },
        },
        select: { id: true },
      },
    );

    if (!professionalProfile) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    const notifications = await this.prisma.inAppNotification.findMany({
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
    });

    return notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      read: n.read,
      created_at: n.created_at,
      created_at_formatted: formatDateDistanceToNow(n.created_at),
    }));
  }
}
