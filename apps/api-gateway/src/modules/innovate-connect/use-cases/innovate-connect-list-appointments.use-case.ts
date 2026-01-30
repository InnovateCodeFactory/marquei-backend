import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InnovateConnectPaginationDto } from '../dto/requests/innovate-connect-pagination.dto';

@Injectable()
export class InnovateConnectListAppointmentsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ page = 1, perPage = 20 }: InnovateConnectPaginationDto) {
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          status: true,
          start_at_utc: true,
          end_at_utc: true,
          created_at: true,
          service: {
            select: {
              id: true,
              name: true,
              business: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          professional: {
            select: {
              id: true,
              business: {
                select: {
                  id: true,
                  name: true,
                },
              },
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          customerPerson: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.appointment.count(),
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
