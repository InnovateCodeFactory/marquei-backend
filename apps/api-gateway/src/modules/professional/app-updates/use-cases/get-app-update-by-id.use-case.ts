import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class GetAppUpdateByIdUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, user: CurrentUser) {
    if (!id) throw new BadRequestException('ID inválido');

    const audience = user?.user_type === 'CUSTOMER' ? 'customer' : 'professional';

    const appUpdate = await this.prisma.appUpdateModal.findFirst({
      where: {
        id,
        is_active: true,
        audience,
      },
      select: {
        id: true,
        mode: true,
        title: true,
        description: true,
        banner_url: true,
        whats_new_items: true,
        primary_button_label: true,
        secondary_button_label: true,
        cta_path: true,
        cta_scope: true,
        target_version_ios: true,
        target_version_android: true,
      },
    });

    if (!appUpdate) throw new NotFoundException('Atualização não encontrada');

    return appUpdate;
  }
}
