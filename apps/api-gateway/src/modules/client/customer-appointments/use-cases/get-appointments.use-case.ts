import { PrismaService } from '@app/shared';
import { CurrentCustomer } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import { GetCustomerAppointmentsDto } from '../dto/requests/get-customer-appointments.dto';

@Injectable()
export class GetCustomerAppointmentsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(query: GetCustomerAppointmentsDto, user: CurrentCustomer) {
    const { page, limit, search, status } = query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const where: any = {
      personId: user.personId,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { serviceName: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [appointments, totalCount] = await Promise.all([
      this.prismaService.appointment.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy: { scheduled_at: 'desc' },
        select: {
          id: true,
          notes: true,
          professional: {
            select: {
              User: {
                select: {
                  name: true,
                },
              },
            },
          },
          status: true,
          service: {
            select: {
              name: true,
              duration: true,
              price_in_cents: true,
              business: {
                select: {
                  name: true,
                },
              },
            },
          },
          scheduled_at: true,
        },
      }),
      this.prismaService.appointment.count({ where }),
    ]);

    return {
      items: appointments,
      totalCount,
      page: pageNumber,
      limit: limitNumber,
      hasMorePages: totalCount > skip + limitNumber,
      totalPages: Math.ceil(totalCount / limitNumber),
    };
  }
}
