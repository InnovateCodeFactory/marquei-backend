import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InnovateConnectPaginationDto } from '../dto/requests/innovate-connect-pagination.dto';

@Injectable()
export class InnovateConnectListSubscriptionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ page = 1, perPage = 20 }: InnovateConnectPaginationDto) {
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.businessSubscription.findMany({
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          status: true,
          current_period_start: true,
          current_period_end: true,
          cancel_at_period_end: true,
          created_at: true,
          business: {
            select: {
              id: true,
              name: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              plan_id: true,
              price_in_cents: true,
              billing_period: true,
            },
          },
        },
      }),
      this.prisma.businessSubscription.count(),
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
