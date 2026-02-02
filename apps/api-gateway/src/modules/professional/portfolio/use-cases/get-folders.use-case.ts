import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class GetPortfolioFoldersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(user: CurrentUser) {
    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    const folders = await this.prisma.businessPortfolioFolder.findMany({
      where: { businessId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        _count: { select: { items: true } },
      },
    });

    return folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      created_at: folder.created_at,
      total_items: folder._count.items,
    }));
  }
}
