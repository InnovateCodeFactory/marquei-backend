import { PrismaService } from '@app/shared';
import { EnvSchemaType } from '@app/shared/environment';
import { FileSystemService } from '@app/shared/services';
import { buildAddress } from '@app/shared/utils';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FindNearbyBusinessesDto } from '../dto/requests/find-nearby-businesses.dto';
import { canViewTestBusinesses } from '../utils/test-business-visibility';

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
    private readonly config: ConfigService<EnvSchemaType>,
  ) {}

  async execute(
    payload: FindNearbyBusinessesDto & { user_id?: string | null },
  ) {
    const {
      latitude,
      longitude,
      radius = 30_000,
      page = 1,
      limit = 5,
      preferred_content,
    } = payload;

    const offset = (page - 1) * limit;
    const categoryId = payload.category_id ?? null;
    const preferredContent = preferred_content ?? null;
    const includeTestBusinesses = canViewTestBusinesses(
      this.config,
      payload.user_id,
    );

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
      WHERE
        b."is_active" = true
        AND (b."is_test" = false OR ${includeTestBusinesses}::boolean = true)
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
    -- filtro de categoria
    AND (
      ${categoryId}::text IS NULL
      OR b."businessCategoryId" = ${categoryId}::text
    )
    -- filtro de conteúdo preferido
    -- Regra:
    -- - payload = MALE => retornar MALE e BOTH
    -- - payload = FEMALE => retornar FEMALE e BOTH
    -- - payload = BOTH => retornar todos (sem filtro)
    -- - payload ausente => sem filtro
    AND (
      ${preferredContent}::text IS NULL
      OR ${preferredContent}::text = 'BOTH'
      OR (
        ${preferredContent}::text = 'MALE' AND (
          b."public_type" = 'MALE' OR b."public_type" = 'BOTH'
        )
      )
      OR (
        ${preferredContent}::text = 'FEMALE' AND (
          b."public_type" = 'FEMALE' OR b."public_type" = 'BOTH'
        )
      )
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
