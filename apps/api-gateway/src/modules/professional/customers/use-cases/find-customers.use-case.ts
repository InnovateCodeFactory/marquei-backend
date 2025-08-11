import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import { FindCustomersDto } from '../dto/requests/find-customers.dto';

@Injectable()
export class FindCustomersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    { search, limit, page }: FindCustomersDto,
    currentUser: CurrentUser,
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 25;
    const skip = (pageNumber - 1) * pageSize;

    const where: any = {
      business: { slug: currentUser.current_selected_business_slug },
    };

    if (search?.trim()) {
      const terms = search.trim().split(/\s+/);
      where.AND = terms.map((t) => ({
        name: { contains: t, mode: 'insensitive' },
      }));
    }

    const [customers, totalCount] = await Promise.all([
      this.prisma.businessContact.findMany({
        where,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          verified: true,
        },
        skip,
        take: pageSize,
      }),
      this.prisma.businessContact.count({ where }),
    ]);

    return {
      customers,
      totalCount,
      page: pageNumber,
      limit: pageSize,
      hasMorePages: totalCount > skip + pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }
}
