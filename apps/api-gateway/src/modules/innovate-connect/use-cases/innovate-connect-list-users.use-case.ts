import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InnovateConnectPaginationDto } from '../dto/requests/innovate-connect-pagination.dto';

@Injectable()
export class InnovateConnectListUsersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ page = 1, perPage = 20 }: InnovateConnectPaginationDto) {
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          user_type: true,
          first_access: true,
          created_at: true,
          person: {
            select: {
              phone: true,
            },
          },
          professional_profile: {
            take: 1,
            select: {
              phone: true,
            },
          },
        },
      }),
      this.prisma.user.count(),
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
