import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { buildAddress } from '@app/shared/utils';
import { Injectable, Logger } from '@nestjs/common';
import { FindNearbyBusinessesDto } from '../dto/requests/find-nearby-businesses.dto';

type RawRow = {
  id: string;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  logo: string | null;
  coverImage: string | null;
  is_verified: boolean;
  zipCode: string | null;
  street: string | null;
  neighbourhood: string | null;
  number: string | null;
  complement: string | null;
  city: string | null;
  uf: string | null;
  rating: number | null;
  reviews_count: number | null;
  distance_m: number;
  total: bigint;
};

const formatDistance = (meters: number): string =>
  meters < 1000
    ? `${Math.round(meters)}m`
    : `${Number((meters / 1000).toFixed(1))}km`;

@Injectable()
export class FindNearbyBusinessesUseCase {
  private readonly logger = new Logger(FindNearbyBusinessesUseCase.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(payload: FindNearbyBusinessesDto) {
    const {
      latitude,
      longitude,
      radius = 30_000,
      page = 1,
      limit = 5,
    } = payload;

    const offset = (page - 1) * limit;
    const categoryId = payload.category_id ?? null;

    // Uma única query: retorna linhas + total (COUNT OVER)
    const rows = await this.prisma.$queryRaw<RawRow[]>`
  WITH
    ref AS (
      SELECT ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography AS g
    ),
    biz AS (
      SELECT
        b.*,
        COALESCE(
          b."location"::geography,
          ST_SetSRID(ST_MakePoint(b."longitude", b."latitude"), 4326)::geography
        ) AS geo
      FROM "Business" b
      WHERE b."is_active" = true
    )
  SELECT
    b."id",
    b."name",
    b."slug",
    b."latitude",
    b."longitude",
    b."logo",
    b."coverImage",
    b."is_verified",
    b."zipCode",
    b."street",
    b."neighbourhood",
    b."number",
    b."complement",
    b."city",
    b."uf",
    b."rating",
    b."reviews_count",
    ST_Distance(b.geo, (SELECT g FROM ref)) AS distance_m,
    COUNT(*) OVER()::bigint AS total
  FROM biz b
  WHERE
    b.geo IS NOT NULL
    AND ST_DWithin(b.geo, (SELECT g FROM ref), ${radius})
    -- 🔧 filtro opcional tipado
    AND (
      ${categoryId}::text IS NULL
      OR b."businessCategoryId" = ${categoryId}::text
    )
  ORDER BY distance_m ASC
  LIMIT ${limit} OFFSET ${offset};
`;

    const totalCount = Number(rows[0]?.total ?? 0);
    const totalPages = Math.ceil(totalCount / limit);

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      latitude: r.latitude,
      longitude: r.longitude,
      logo: this.fs.getPublicUrl({ key: r.logo }),
      cover_image: this.fs.getPublicUrl({ key: r.coverImage }),
      is_verified: r.is_verified,
      address: buildAddress(r),
      rating: Number((r.rating ?? 0).toFixed(1)),
      ratings_count: r.reviews_count ?? 0,
      distance: formatDistance(r.distance_m),
    }));

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
