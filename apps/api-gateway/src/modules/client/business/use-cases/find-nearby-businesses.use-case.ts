import { PrismaService } from '@app/shared';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FindNearbyBusinessesDto } from '../dto/requests/find-nearby-businesses.dto';

@Injectable()
export class FindNearbyBusinessesUseCase implements OnModuleInit {
  private readonly logger = new Logger(FindNearbyBusinessesUseCase.name);

  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    // await this.execute({ latitude: -16.022402, longitude: -48.073285 });
  }

  async execute(payload: FindNearbyBusinessesDto) {
    const {
      latitude,
      longitude,
      radius = 20_000,
      page = 1,
      limit = 5,
    } = payload;

    const offset = (page - 1) * limit;

    const listQuery = this.prismaService.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        latitude: number | null;
        longitude: number | null;
        // mídia e flags
        logo: string | null;
        coverImage: string | null;
        is_verified: boolean;
        // endereço
        zipCode: string | null;
        street: string | null;
        neighbourhood: string | null;
        number: string | null;
        complement: string | null;
        city: string | null;
        uf: string | null;
        // rating
        rating: number | null;
        reviews_count: number | null;
        // distância
        distance_m: number;
      }>
    >`
      WITH ref AS (
        SELECT ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography AS g
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
        ST_Distance(
          COALESCE(
            b."location"::geography,
            ST_SetSRID(ST_MakePoint(b."longitude", b."latitude"), 4326)::geography
          ),
          (SELECT g FROM ref)
        ) AS distance_m
      FROM "Business" b
      WHERE
        b."is_active" = true
        AND COALESCE(
              b."location"::geography,
              ST_SetSRID(ST_MakePoint(b."longitude", b."latitude"), 4326)::geography
            ) IS NOT NULL
        AND ST_DWithin(
              COALESCE(
                b."location"::geography,
                ST_SetSRID(ST_MakePoint(b."longitude", b."latitude"), 4326)::geography
              ),
              (SELECT g FROM ref),
              ${radius}
            )
      ORDER BY distance_m ASC
      LIMIT ${limit} OFFSET ${offset};
    `;

    const countQuery = this.prismaService.$queryRaw<Array<{ total: bigint }>>`
      WITH ref AS (
        SELECT ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography AS g
      )
      SELECT COUNT(*)::bigint AS total
      FROM "Business" b
      WHERE
        b."is_active" = true
        AND COALESCE(
              b."location"::geography,
              ST_SetSRID(ST_MakePoint(b."longitude", b."latitude"), 4326)::geography
            ) IS NOT NULL
        AND ST_DWithin(
              COALESCE(
                b."location"::geography,
                ST_SetSRID(ST_MakePoint(b."longitude", b."latitude"), 4326)::geography
              ),
              (SELECT g FROM ref),
              ${radius}
            );
    `;

    const [results, countRows] = await Promise.all([listQuery, countQuery]);

    const formatDistance = (meters: number): string => {
      if (meters < 1000) return `${Math.round(meters)}m`;
      const km = meters / 1000;
      return `${Number(km.toFixed(1))}km`;
    };

    const buildAddress = (r: {
      street: string | null;
      number: string | null;
      neighbourhood: string | null;
      city: string | null;
      uf: string | null;
      complement: string | null;
    }) => {
      const line1 = [r.street, r.number].filter(Boolean).join(', ');
      const line2 = [r.neighbourhood, r.city, r.uf].filter(Boolean).join(' - ');
      const comp = r.complement ? ` (${r.complement})` : '';
      return [line1, line2].filter(Boolean).join(' • ') + comp;
    };

    const totalCount = Number(countRows[0]?.total ?? 0);
    const totalPages = Math.ceil(totalCount / limit);

    const items = results.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      latitude: r.latitude,
      longitude: r.longitude,
      logo: r.logo,
      cover_image: r.coverImage,
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
