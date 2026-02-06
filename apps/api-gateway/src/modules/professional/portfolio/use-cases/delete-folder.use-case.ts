import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class DeletePortfolioFolderUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(user: CurrentUser, folderId: string) {
    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');
    if (!folderId) throw new BadRequestException('Folder not provided');

    const folder = await this.prisma.businessPortfolioFolder.findFirst({
      where: { id: folderId, businessId },
      select: { id: true },
    });

    if (!folder) throw new NotFoundException('Folder not found');

    const items = await this.prisma.businessPortfolioItem.findMany({
      where: { folderId: folder.id, businessId },
      select: { id: true, key: true },
    });

    await this.prisma.$transaction([
      this.prisma.businessPortfolioItem.deleteMany({
        where: { folderId: folder.id, businessId },
      }),
      this.prisma.businessPortfolioFolder.delete({ where: { id: folder.id } }),
    ]);

    for (const item of items) {
      if (!item.key) continue;
      try {
        await this.fs.delete(item.key);
      } catch {
        // mantém exclusão do registro mesmo se a remoção do arquivo falhar
      }
    }

    return { id: folder.id, deleted: true };
  }
}
