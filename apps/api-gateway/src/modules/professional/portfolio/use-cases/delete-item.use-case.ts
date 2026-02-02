import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class DeletePortfolioItemUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(user: CurrentUser, itemId: string) {
    const portfolioModel = (this.prisma as any)?.businessPortfolioItem;
    if (!portfolioModel?.findFirst || !portfolioModel?.delete) {
      throw new InternalServerErrorException(
        'Prisma client desatualizado para BusinessPortfolioItem. Rode prisma generate e reinicie o backend.',
      );
    }

    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');
    if (!itemId) throw new BadRequestException('Item not provided');

    const item = await portfolioModel.findFirst({
      where: { id: itemId, businessId },
      select: { id: true, key: true },
    });

    if (!item) throw new NotFoundException('Item not found');

    await portfolioModel.delete({ where: { id: item.id } });

    if (item.key) {
      try {
        await this.fs.delete(item.key);
      } catch {
        // Mantém a exclusão do registro mesmo se a remoção do arquivo falhar.
      }
    }

    return { id: item.id, deleted: true };
  }
}
