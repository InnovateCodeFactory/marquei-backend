import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { buildAddress } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';
import { FilterBusinessesDto } from '../dto/requests/filter-businesses.dto';

@Injectable()
export class FilterBusinessesUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(query: FilterBusinessesDto) {
    if (!query.name && !query.categories?.length) return [];

    const where: any = {
      is_active: true,
    };

    if (query.name) {
      where.name = {
        contains: query.name,
        mode: 'insensitive',
      };
    }

    if (query.categories?.length) {
      where.businessCategoryId = { in: query.categories };
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = Math.min(parseInt(query.limit, 10) || 10, 50);
    const offset = (page - 1) * limit;

    const [businesses, totalCount] = await Promise.all([
      this.prismaService.business.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          coverImage: true,
          rating: true,
          reviews_count: true,
          city: true,
          uf: true,
          complement: true,
          neighbourhood: true,
          number: true,
          street: true,
          is_verified: true,
        },
        skip: offset,
        take: limit,
      }),

      this.prismaService.business.count({ where }),
    ]);

    const items = businesses.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logo: this.fs.getPublicUrl({ key: b.logo }),
      cover_image: this.fs.getPublicUrl({ key: b.coverImage }),
      rating: b.rating?.toFixed(1),
      ratings_count: b.reviews_count,
      address: buildAddress(b),
      is_verified: b.is_verified,
      distance: null,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return {
      items,
      page,
      limit,
      total: totalCount,
      totalPages,
      hasMorePages: page < totalPages,
    };
  }
}
