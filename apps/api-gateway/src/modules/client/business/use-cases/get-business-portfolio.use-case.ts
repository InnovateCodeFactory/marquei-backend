import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GetBusinessBySlugDto } from '../dto/requests/get-business-by-slug.dto';

@Injectable()
export class GetBusinessPortfolioUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(query: GetBusinessBySlugDto) {
    const business = await this.prisma.business.findUnique({
      where: { slug: query.slug },
      select: { id: true },
    });

    if (!business) throw new NotFoundException('Empresa não encontrada');

    const [folders, looseItems] = await Promise.all([
      this.prisma.businessPortfolioFolder.findMany({
        where: { businessId: business.id },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          items: {
            orderBy: { created_at: 'desc' },
            select: {
              id: true,
              key: true,
              created_at: true,
            },
          },
        },
      }),
      this.prisma.businessPortfolioItem.findMany({
        where: { businessId: business.id, folderId: null },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          key: true,
          created_at: true,
        },
      }),
    ]);

    const foldersWithItems = folders
      .filter((folder) => (folder.items?.length ?? 0) > 0)
      .map((folder) => ({
        id: folder.id,
        name: folder.name,
        description: folder.description,
        created_at: folder.created_at,
        total_items: folder.items.length,
        cover_image: folder.items[0]?.key
          ? this.fs.getPublicUrl({ key: folder.items[0].key })
          : null,
        items: folder.items.map((item) => ({
          id: item.id,
          key: item.key,
          created_at: item.created_at,
          url: this.fs.getPublicUrl({ key: item.key }),
        })),
      }));

    return {
      folders: foldersWithItems,
      loose_items: looseItems.map((item) => ({
        id: item.id,
        key: item.key,
        created_at: item.created_at,
        url: this.fs.getPublicUrl({ key: item.key }),
      })),
    };
  }
}
