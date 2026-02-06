import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdatePortfolioFolderDto } from '../dto/requests';

@Injectable()
export class UpdatePortfolioFolderUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(user: CurrentUser, folderId: string, dto: UpdatePortfolioFolderDto) {
    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');
    if (!folderId) throw new BadRequestException('Folder not provided');

    const folder = await this.prisma.businessPortfolioFolder.findFirst({
      where: { id: folderId, businessId },
      select: { id: true },
    });

    if (!folder) throw new NotFoundException('Folder not found');

    const updated = await this.prisma.businessPortfolioFolder.update({
      where: { id: folder.id },
      data: { name: dto.name.trim() },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
      },
    });

    return updated;
  }
}
