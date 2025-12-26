import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { buildAddress } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';

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

@Injectable()
export class FindBusinessesByStateUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(payload: {
    uf: string;
    page?: number;
    limit?: number;
    category_id?: string | null;
    preferred_content?: string | null;
  }) {
    const page = payload.page ?? 1;
    const limit = payload.limit ?? 5;
    const offset = (page - 1) * limit;
    const categoryId = payload.category_id ?? null;
    const preferredContent = payload.preferred_content ?? null;
    const uf = payload.uf?.trim().toUpperCase();

    if (!uf) {
      return {
        items: [],
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasMorePages: false,
      };
    }

    const rows = await this.prisma.$queryRaw<RawRow[]>`
  WITH
    biz AS (
      SELECT b.*
      FROM "Business" b
      WHERE b."is_active" = true
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
        UPPER(COALESCE(b."uf", '')) = ${uf}
        AND (
          ${categoryId}::text IS NULL
          OR b."businessCategoryId" = ${categoryId}::text
        )
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
      distance: '',
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
