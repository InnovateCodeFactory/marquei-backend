import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetBusinessCategoriesUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute() {
    const categories = await this.prismaService.businessCategory.findMany({
      select: {
        name: true,
        id: true,
        icon_path: true,
        icon_path_light: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    return categories?.map((cat) => ({
      ...cat,
      icon_path: `${this.fileSystem.getPublicUrl({ key: cat.icon_path })}`,
      icon_path_light: `${this.fileSystem.getPublicUrl({ key: cat.icon_path_light })}`,
    }));
  }
}
