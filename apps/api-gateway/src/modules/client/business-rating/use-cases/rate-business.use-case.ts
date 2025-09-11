import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { BadRequestException, Injectable } from '@nestjs/common';
import { RateBusinessDto } from '../dto/rate-business.dto';

@Injectable()
export class RateBusinessUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: RateBusinessDto, req: AppRequest) {
    // validação básica do score
    if (dto.score < 1 || dto.score > 5) {
      throw new BadRequestException('Score deve estar entre 1 e 5.');
    }

    const userAlreadyRated = await this.prisma.businessRating.findFirst({
      where: { business_slug: dto.business_slug, userId: req.user.id },
      select: { id: true },
    });
    if (userAlreadyRated) {
      throw new BadRequestException('Você já avaliou este estabelecimento.');
    }

    await this.prisma.$transaction(async (tx) => {
      // cria a avaliação
      await tx.businessRating.create({
        data: {
          business: { connect: { slug: dto.business_slug } },
          user: { connect: { id: req.user.id } },
          rating: dto.score,
          review: dto.comment ?? null,
        },
      });

      // Atualiza contadores por estrela + reviews_count
      // e recalcula a média ponderada usando os valores JÁ incrementados
      await tx.$executeRawUnsafe(
        `
        UPDATE "Business"
        SET
          reviews_count    = reviews_count + 1,
          total_one_star   = total_one_star   + CASE WHEN $1 = 1 THEN 1 ELSE 0 END,
          total_two_star   = total_two_star   + CASE WHEN $1 = 2 THEN 1 ELSE 0 END,
          total_three_star = total_three_star + CASE WHEN $1 = 3 THEN 1 ELSE 0 END,
          total_four_star  = total_four_star  + CASE WHEN $1 = 4 THEN 1 ELSE 0 END,
          total_five_star  = total_five_star  + CASE WHEN $1 = 5 THEN 1 ELSE 0 END,
          rating = (
            ((total_one_star   + CASE WHEN $1 = 1 THEN 1 ELSE 0 END) * 1) +
            ((total_two_star   + CASE WHEN $1 = 2 THEN 1 ELSE 0 END) * 2) +
            ((total_three_star + CASE WHEN $1 = 3 THEN 1 ELSE 0 END) * 3) +
            ((total_four_star  + CASE WHEN $1 = 4 THEN 1 ELSE 0 END) * 4) +
            ((total_five_star  + CASE WHEN $1 = 5 THEN 1 ELSE 0 END) * 5)
          )::float / (reviews_count + 1)
        WHERE slug = $2
        `,
        dto.score,
        dto.business_slug,
      );
    });

    return null;
  }
}
