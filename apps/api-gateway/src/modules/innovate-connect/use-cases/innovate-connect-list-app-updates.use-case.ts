import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { Injectable } from '@nestjs/common';
import { InnovateConnectListAppUpdatesDto } from '../dto/requests/innovate-connect-list-app-updates.dto';

@Injectable()
export class InnovateConnectListAppUpdatesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute({
    page = 1,
    perPage = 20,
    mode,
    audience,
    is_active,
  }: InnovateConnectListAppUpdatesDto) {
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;

    const where = {
      ...(mode ? { mode } : {}),
      ...(audience ? { audience } : {}),
      ...(typeof is_active === 'boolean' ? { is_active } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.appUpdateModal.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          mode: true,
          audience: true,
          title: true,
          description: true,
          banner_url: true,
          whats_new_items: true,
          primary_button_label: true,
          secondary_button_label: true,
          target_version_ios: true,
          target_version_android: true,
          target_build_ios: true,
          target_build_android: true,
          cta_path: true,
          cta_scope: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      }),
      this.prisma.appUpdateModal.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        banner_key: item.banner_url,
        banner_url: item.banner_url
          ? this.fileSystem.getPublicUrl({ key: item.banner_url })
          : null,
      })),
      meta: {
        page,
        perPage: take,
        total,
      },
    };
  }
}

