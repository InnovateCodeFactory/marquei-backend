import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisterAppUpdateInteractionDto } from '../dto/requests/register-app-update-interaction.dto';

type AppMeta = {
  appVersion?: string;
  appOs?: string;
};

@Injectable()
export class RegisterAppUpdateInteractionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    dto: RegisterAppUpdateInteractionDto,
    user: CurrentUser,
    meta: AppMeta,
  ) {
    if (!user?.id) throw new BadRequestException('Usuário inválido');

    const appUpdate = await this.prisma.appUpdateModal.findFirst({
      where: {
        id: dto.app_update_id,
        is_active: true,
        audience: 'PROFESSIONAL',
      },
      select: { id: true },
    });

    if (!appUpdate) throw new BadRequestException('Atualização inválida');

    const existing = await this.prisma.appUpdateInteraction.findFirst({
      where: {
        app_update_id: dto.app_update_id,
        user_id: user.id,
        action: dto.action,
      },
      select: { id: true },
    });

    if (existing) return null;

    await this.prisma.appUpdateInteraction.create({
      data: {
        app_update_id: dto.app_update_id,
        user_id: user.id,
        action: dto.action,
        app_version: meta?.appVersion,
        app_os: meta?.appOs,
      },
    });

    return null;
  }
}
