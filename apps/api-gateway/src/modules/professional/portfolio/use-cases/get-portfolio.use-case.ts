import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class GetPortfolioUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(user: CurrentUser) {
    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    const [folders, looseItems] = await Promise.all([
      this.prisma.businessPortfolioFolder.findMany({
        where: { businessId },
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
              uploadedById: true,
            },
          },
        },
      }),
      this.prisma.businessPortfolioItem.findMany({
        where: { businessId, folderId: null },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          key: true,
          created_at: true,
          uploadedById: true,
        },
      }),
    ]);

    const formatItem = (item: {
      id: string;
      key: string;
      created_at: Date;
      uploadedById: string;
    }) => ({
      id: item.id,
      key: item.key,
      url: this.fs.getPublicUrl({ key: item.key }),
      created_at: item.created_at,
      uploaded_by_id: item.uploadedById,
    });

    return {
      folders: folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        description: folder.description,
        created_at: folder.created_at,
        items: folder.items.map(formatItem),
      })),
      loose_items: looseItems.map(formatItem),
    };
  }
}
