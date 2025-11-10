import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetCategoriesUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute() {
    const res = await this.prismaService.businessCategory.findMany({
      select: {
        id: true,
        name: true,
        icon_path: true,
        icon_path_light: true,
      },
      orderBy: {
        order: 'asc',
      },
    });
    return res.map((category) => ({
      id: category.id,
      name: category.name,
      icon_path: this.fileSystem.getPublicUrl({
        key: category.icon_path,
      }),
      icon_path_light: this.fileSystem.getPublicUrl({
        key: category.icon_path_light,
      }),
    }));
  }
}
