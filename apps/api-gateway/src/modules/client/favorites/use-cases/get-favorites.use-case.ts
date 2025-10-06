import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import { buildAddress } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GetFavoritesDto } from '../dto/requests/get-favorites.dto';

@Injectable()
export class GetFavoritesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(query: GetFavoritesDto, req: AppRequest) {
    const personId = req.user?.personId as string;

    const page = parseInt(String(query.page), 10) || 1;
    const limit = Math.min(parseInt(String(query.limit), 10) || 10, 50);
    const offset = (page - 1) * limit;

    const searchTrimmed = (query.search ?? '').trim();
    // Escape wildcard characters for ILIKE and force ESCAPE '\\'
    const escaped = searchTrimmed.replace(/[%_]/g, '\\$&');

    const searchFilter =
      escaped.length > 0
        ? Prisma.sql`AND unaccent(b."name") ILIKE unaccent(${`%${escaped}%`}) ESCAPE '\\'`
        : Prisma.sql``;

    type Row = {
      id: string;
      name: string;
      slug: string;
      logo: string | null;
      coverImage: string | null;
      rating: number | null;
      reviews_count: number | null;
      city: string | null;
      uf: string | null;
      complement: string | null;
      neighbourhood: string | null;
      number: string | null;
      street: string | null;
      is_verified: boolean;
    };

    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        b.id,
        b.name,
        b.slug,
        b."logo",
        b."coverImage",
        b.rating,
        b.reviews_count,
        b.city,
        b.uf,
        b.complement,
        b.neighbourhood,
        b.number,
        b.street,
        b.is_verified
      FROM "Favorite" f
      JOIN "Business" b ON b.id = f."businessId"
      WHERE f."personId" = ${personId}
      ${searchFilter}
      ORDER BY f.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countRows = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "Favorite" f
        JOIN "Business" b ON b.id = f."businessId"
        WHERE f."personId" = ${personId}
        ${searchFilter}
      `,
    );

    const total = Number(countRows[0]?.count ?? 0);

    const items = rows.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logo: this.fs.getPublicUrl({
        key: b.logo,
      }),
      cover_image: this.fs.getPublicUrl({
        key: b.coverImage,
      }),
      rating: Number((b.rating ?? 0).toFixed(1)),
      ratings_count: b.reviews_count ?? 0,
      address: buildAddress(b),
      is_verified: b.is_verified,
      distance: null,
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items,
      page,
      limit,
      total,
      totalPages,
      hasMorePages: page < totalPages,
    };
  }
}
