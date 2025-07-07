import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import { FindCustomersDto } from '../dto/requests/find-customers.dto';

@Injectable()
export class FindCustomersUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(
    { search, limit, page }: FindCustomersDto,
    currentUser: CurrentUser,
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 25;
    const skip = (pageNumber - 1) * pageSize;

    const whereClause: any = {
      business: {
        slug: currentUser.current_selected_business_slug,
      },
    };

    if (search?.trim()) {
      const terms = search.trim().split(/\s+/);

      // aplica AND com contains para todas as palavras
      whereClause.AND = terms.map((term) => ({
        name: {
          contains: term,
          mode: 'insensitive',
        },
      }));
    }

    const [customers, totalCount] = await Promise.all([
      this.prismaService.customer.findMany({
        where: whereClause,
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
        skip,
        take: pageSize,
      }),
      this.prismaService.customer.count({
        where: whereClause,
      }),
    ]);

    const hasMorePages = totalCount > skip + pageSize;

    const obj = {
      customers,
      totalCount,
      page: pageNumber,
      limit: pageSize,
      hasMorePages,
      totalPages: Math.ceil(totalCount / pageSize),
    };

    return obj;
  }
}
