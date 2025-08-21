import { PrismaService } from '@app/shared';
import { formatDuration } from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { Injectable } from '@nestjs/common';
import { GetServicesDto } from '../dto/requests/get-services.dto';

@Injectable()
export class GetServicesUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(query: GetServicesDto) {
    const page = parseInt(query.page, 10);
    const limit = parseInt(query.limit, 10);
    const skip = (page - 1) * limit;

    const where = {
      business: {
        slug: query.slug,
      },
    };

    const [services, total] = await Promise.all([
      this.prismaService.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          appointments: {
            _count: 'desc',
          },
        },
        select: {
          id: true,
          name: true,
          duration: true,
          price_in_cents: true,
        },
      }),
      this.prismaService.service.count({
        where,
      }),
    ]);

    const items = (services ?? [])?.map((service) => ({
      id: service.id,
      name: service.name,
      duration: formatDuration(service.duration),
      price: new Price(service.price_in_cents).toCurrency(),
    }));

    const totalPages = Math.ceil(total / limit);
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
