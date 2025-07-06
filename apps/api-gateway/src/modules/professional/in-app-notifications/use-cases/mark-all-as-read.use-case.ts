import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MarkAllInAppNotificationsAsReadUseCase {
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

    await this.prismaService.inAppNotification.updateMany({
      where: {
        professionalProfileId: professionalProfile.id,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return null;
  }
}
