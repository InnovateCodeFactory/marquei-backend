import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class GetSelfNotificationsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(req: AppRequest) {
    const id = req.user?.professional_profile_id;
    if (!id) throw new NotFoundException('Perfil não encontrado');

    const profile = await this.prismaService.professionalProfile.findUnique({
      where: { id },
      select: {
        push_notification_enabled: true,
        email_notification_enabled: true,
      },
    });

    if (!profile) throw new NotFoundException('Perfil não encontrado');

    return profile;
  }
}

