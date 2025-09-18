// use-cases/get-reviews.usecase.ts
import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { Injectable, NotFoundException } from '@nestjs/common';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GetReviewsDto } from '../dto/get-reviews.dto';

@Injectable()
export class GetReviewsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute(query: GetReviewsDto) {
    const page = Number.parseInt(String(query.page ?? 1), 10) || 1;
    const limit = Number.parseInt(String(query.limit ?? 10), 10) || 10;
    const skip = (page - 1) * limit;

    const business = await this.prisma.business.findUnique({
      where: { slug: query.business_slug },
      select: { slug: true },
    });
    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }

    const where = {
      business_slug: query.business_slug,
      review: { not: null },
    };

    const [reviews, total] = await Promise.all([
      this.prisma.businessRating.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          rating: true,
          review: true,
          created_at: true,
          user: {
            select: {
              id: true,
              name: true,
              person: { select: { profile_image: true } },
            },
          },
        },
      }),
      this.prisma.businessRating.count({
        where,
      }),
    ]);

    const items = reviews.map((r) => ({
      id: r.id,
      user: {
        id: r.user?.id ?? '',
        name: r.user?.name ?? '',
        avatar: this.fileSystem.getPublicUrl({
          key: r.user?.person?.profile_image ?? '',
        }),
      },
      rating: r.rating,
      rating_formatted: `${r.rating},0`, // simples → ex: "4,0"
      comment: r.review ?? '',
      created_at: r.created_at.toISOString(),
      created_at_formatted: format(r.created_at, 'dd/MM/yyyy HH:mm', {
        locale: ptBR,
      }),
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasMorePages = page < totalPages;

    return {
      items,
      page,
      limit,
      total,
      totalPages,
      hasMorePages,
    };
  }
}
