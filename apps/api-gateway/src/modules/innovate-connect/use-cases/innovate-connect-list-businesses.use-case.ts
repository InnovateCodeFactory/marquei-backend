import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InnovateConnectPaginationDto } from '../dto/requests/innovate-connect-pagination.dto';

@Injectable()
export class InnovateConnectListBusinessesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ page = 1, perPage = 20 }: InnovateConnectPaginationDto) {
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          is_active: true,
          is_verified: true,
          is_test: true,
          rating: true,
          reviews_count: true,
          public_type: true,
          uf: true,
          city: true,
          phone: true,
          BusinessCategory: {
            select: {
              id: true,
              name: true,
            },
          },
          BusinessServiceType: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              services: true,
              professionals: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.business.count(),
    ]);

    return {
      items,
      meta: {
        page,
        perPage: take,
        total,
      },
    };
  }
}
