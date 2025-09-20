import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddFavoriteDto } from '../dto/requests/add-favorite.dto';

@Injectable()
export class AddFavoriteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: AddFavoriteDto, req: AppRequest) {
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

    await this.prisma.favorite.upsert({
      where: {
        uq_favorite_person_business: {
          personId,
          businessId: business.id,
        },
      },
      update: {},
      create: {
        person: { connect: { id: personId } },
        business: { connect: { id: business.id } },
      },
    });

    return null;
  }
}
