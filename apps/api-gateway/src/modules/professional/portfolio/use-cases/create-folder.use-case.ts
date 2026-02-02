import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePortfolioFolderDto } from '../dto/requests';

@Injectable()
export class CreatePortfolioFolderUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(user: CurrentUser, dto: CreatePortfolioFolderDto) {
    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    const folder = await this.prisma.businessPortfolioFolder.create({
      data: {
        business: { connect: { id: businessId } },
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        created_by: { connect: { id: user.id } },
      },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
      },
    });

    return folder;
  }
}
