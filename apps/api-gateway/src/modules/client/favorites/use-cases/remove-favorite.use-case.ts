import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RemoveFavoriteDto } from '../dto/requests/remove-favorite.dto';

@Injectable()
export class RemoveFavoriteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: RemoveFavoriteDto, req: AppRequest) {
    const personId = req.user?.personId;
    if (!personId) {
      throw new BadRequestException(
        'Perfil de cliente não encontrado para este usuário.',
      );
    }

    const business = await this.prisma.business.findUnique({
      where: { slug: dto.business_slug },
      select: { id: true },
    });
    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }

    await this.prisma.favorite.deleteMany({
      where: { personId, businessId: business.id },
    });

    return null;
  }
}
