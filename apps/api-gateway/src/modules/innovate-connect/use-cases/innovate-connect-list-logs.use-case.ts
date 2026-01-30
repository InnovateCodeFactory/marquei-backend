import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InnovateConnectPaginationDto } from '../dto/requests/innovate-connect-pagination.dto';

@Injectable()
export class InnovateConnectListLogsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ page = 1, perPage = 20 }: InnovateConnectPaginationDto) {
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.logs.findMany({
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          body: true,
          query: true,
          response: true,
          method: true,
          endpoint: true,
          success: true,
          datetime: true,
          latencyMs: true,
          user_id: true,
          device_token: true,
          app_version: true,
          app_os: true,
          created_at: true,
        },
      }),
      this.prisma.logs.count(),
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
