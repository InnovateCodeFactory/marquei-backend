import { PrismaService } from '@app/shared';
import { EnvSchemaType } from '@app/shared/environment';
import { FileSystemService } from '@app/shared/services';
import { buildAddress } from '@app/shared/utils';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FindRecommendedBusinessesDto } from '../dto/requests/find-recommended-businesses.dto';
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
  distance_m: number | null;
  plan_price: number | null;
  total_appointments: number | null;
  total: bigint;
};

const formatDistance = (meters: number): string =>
  meters < 1000
    ? `${Math.round(meters)}m`
    : `${Number((meters / 1000).toFixed(1))}km`;

@Injectable()
export class FindRecommendedBusinessesUseCase {
  private readonly logger = new Logger(FindRecommendedBusinessesUseCase.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: FileSystemService,
    private readonly config: ConfigService<EnvSchemaType>,
  ) {}

  async execute(
    payload: FindRecommendedBusinessesDto & { user_id?: string | null },
  ) {
    const {
      latitude,
      longitude,
      page = 1,
      limit = 5,
      preferred_content,
    } = payload;

    const offset = (page - 1) * limit;
    const categoryId = payload.category_id ?? null;
    const preferredContent = preferred_content ?? null;
    const radius = payload.radius ?? null;
    const hasCoords =
      typeof latitude === 'number' && typeof longitude === 'number';
    const includeTestBusinesses = canViewTestBusinesses(
      this.config,
      payload.user_id,
    );

    const rows = hasCoords
      ? await this.prisma.$queryRaw<RawRow[]>`
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
    ),
    filtered AS (
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
        ST_Distance(b.geo, (SELECT g FROM ref)) AS distance_m
      FROM biz b
      WHERE
        b.geo IS NOT NULL
        AND (
          ${radius}::double precision IS NULL
          OR ST_DWithin(b.geo, (SELECT g FROM ref), ${radius})
        )
        -- filtro de categoria
        AND (
          ${categoryId}::text IS NULL
          OR b."businessCategoryId" = ${categoryId}::text
        )
        -- filtro de conteúdo preferido
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
    ),
    subs AS (
      SELECT
        bs."businessId" AS business_id,
        MAX(p."price_in_cents")::int AS plan_price
      FROM "BusinessSubscription" bs
      JOIN "Plan" p ON p."id" = bs."planId"
      WHERE
        bs."status" IN ('ACTIVE', 'TRIALING', 'PAST_DUE')
        AND bs."current_period_end" > NOW()
      GROUP BY bs."businessId"
    ),
    appts AS (
      SELECT
        s."businessId" AS business_id,
        COUNT(*)::int AS total_appointments
      FROM "Appointment" a
      JOIN "Service" s ON s."id" = a."service_id"
      WHERE s."businessId" IN (SELECT id FROM filtered)
      GROUP BY s."businessId"
    )
  SELECT
    f.*,
    COALESCE(subs.plan_price, 0) AS plan_price,
    COALESCE(appts.total_appointments, 0) AS total_appointments,
    COUNT(*) OVER()::bigint AS total
  FROM filtered f
  LEFT JOIN subs ON subs.business_id = f.id
  LEFT JOIN appts ON appts.business_id = f.id
  ORDER BY
    (CASE WHEN COALESCE(subs.plan_price, 0) > 0 THEN 1 ELSE 0 END) DESC,
    subs.plan_price DESC NULLS LAST,
    f."rating" DESC NULLS LAST,
    f."reviews_count" DESC NULLS LAST,
    appts.total_appointments DESC NULLS LAST,
    f.distance_m ASC
  LIMIT ${limit} OFFSET ${offset};
`
      : await this.prisma.$queryRaw<RawRow[]>`
  WITH
    biz AS (
      SELECT b.*
      FROM "Business" b
      WHERE
        b."is_active" = true
        AND (b."is_test" = false OR ${includeTestBusinesses}::boolean = true)
    ),
    filtered AS (
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
        NULL::double precision AS distance_m
      FROM biz b
      WHERE
        -- filtro de categoria
        (
          ${categoryId}::text IS NULL
          OR b."businessCategoryId" = ${categoryId}::text
        )
        -- filtro de conteúdo preferido
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
    ),
    subs AS (
      SELECT
        bs."businessId" AS business_id,
        MAX(p."price_in_cents")::int AS plan_price
      FROM "BusinessSubscription" bs
      JOIN "Plan" p ON p."id" = bs."planId"
      WHERE
        bs."status" IN ('ACTIVE', 'TRIALING', 'PAST_DUE')
        AND bs."current_period_end" > NOW()
      GROUP BY bs."businessId"
    ),
    appts AS (
      SELECT
        s."businessId" AS business_id,
        COUNT(*)::int AS total_appointments
      FROM "Appointment" a
      JOIN "Service" s ON s."id" = a."service_id"
      WHERE s."businessId" IN (SELECT id FROM filtered)
      GROUP BY s."businessId"
    )
  SELECT
    f.*,
    COALESCE(subs.plan_price, 0) AS plan_price,
    COALESCE(appts.total_appointments, 0) AS total_appointments,
    COUNT(*) OVER()::bigint AS total
  FROM filtered f
  LEFT JOIN subs ON subs.business_id = f.id
  LEFT JOIN appts ON appts.business_id = f.id
  ORDER BY
    (CASE WHEN COALESCE(subs.plan_price, 0) > 0 THEN 1 ELSE 0 END) DESC,
    subs.plan_price DESC NULLS LAST,
    f."rating" DESC NULLS LAST,
    f."reviews_count" DESC NULLS LAST,
    appts.total_appointments DESC NULLS LAST
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
      distance: r.distance_m !== null ? formatDistance(r.distance_m) : '',
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
