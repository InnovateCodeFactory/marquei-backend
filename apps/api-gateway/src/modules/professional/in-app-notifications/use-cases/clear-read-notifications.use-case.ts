import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ClearReadNotificationsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(user: CurrentUser) {
    const professional = await this.prisma.professionalProfile.findFirst({
      where: {
        userId: user.id,
        business_id: user.current_selected_business_id,
      },
      select: { id: true },
    });

    if (!professional) throw new Error('Perfil profissional não encontrado');

    await this.prisma.inAppNotification.updateMany({
      where: {
        professionalProfileId: professional.id,
        read: true,
        is_visible: true,
      },
      data: { is_visible: false },
    });

    return null;
  }
}

