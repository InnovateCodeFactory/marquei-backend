import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InnovateConnectPaginationDto } from '../dto/requests/innovate-connect-pagination.dto';

@Injectable()
export class InnovateConnectListServicesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ page = 1, perPage = 20 }: InnovateConnectPaginationDto) {
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          duration: true,
          price_in_cents: true,
          is_active: true,
          created_at: true,
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.service.count(),
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
