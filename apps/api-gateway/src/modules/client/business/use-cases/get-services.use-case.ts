import { PrismaService } from '@app/shared';
import { formatDuration } from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GetServicesDto } from '../dto/requests/get-services.dto';

@Injectable()
export class GetServicesUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(query: GetServicesDto) {
    const page = parseInt(query.page, 10);
    const limit = parseInt(query.limit, 10);
    const skip = (page - 1) * limit;

    const searchTrimmed = (query.search ?? '').trim();
    const escaped = searchTrimmed.replace(/[%_]/g, '\\$&');
    const searchLike = `%${escaped}%`;
    const searchDigits = searchTrimmed.replace(/\D/g, '');
    const numericSearch = Number.parseInt(searchTrimmed.replace(/\D/g, ''), 10);
    const decimalSearch = Number.parseFloat(
      searchTrimmed.replace(/\./g, '').replace(',', '.'),
    );
    const priceInCentsFromDecimal = Number.isFinite(decimalSearch)
      ? Math.round(decimalSearch * 100)
      : null;

    const digitsFilter =
      searchDigits.length > 0
        ? Prisma.sql`OR s."price_in_cents"::text ILIKE ${`%${searchDigits}%`} ESCAPE '\\'`
        : Prisma.sql``;

    const searchFilter =
      escaped.length > 0
        ? Prisma.sql`
            AND (
              unaccent(s."name") ILIKE unaccent(${searchLike}) ESCAPE '\\'
              OR s."duration"::text ILIKE ${searchLike} ESCAPE '\\'
              ${digitsFilter}
              OR (${Number.isFinite(numericSearch)} AND (
                s."duration" = ${Number.isFinite(numericSearch) ? numericSearch : -1}
                OR s."price_in_cents" = ${Number.isFinite(numericSearch) ? numericSearch : -1}
              ))
              OR (${priceInCentsFromDecimal !== null} AND s."price_in_cents" = ${priceInCentsFromDecimal ?? -1})
            )
          `
        : Prisma.sql``;

    type ServiceRow = {
      id: string;
      name: string;
      duration: number;
      price_in_cents: number;
    };

    const [rows, countRows] = await Promise.all([
      this.prismaService.$queryRaw<ServiceRow[]>(Prisma.sql`
        SELECT
          s.id,
          s."name",
          s."duration",
          s."price_in_cents"
        FROM "Service" s
        JOIN "Business" b ON b.id = s."businessId"
        WHERE
          s."is_active" = true
          AND b.slug = ${query.slug}
          ${searchFilter}
        ORDER BY (
          SELECT COUNT(*)::int
          FROM "Appointment" a
          WHERE a.service_id = s.id
        ) DESC
        LIMIT ${limit} OFFSET ${skip}
      `),
      this.prismaService.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "Service" s
        JOIN "Business" b ON b.id = s."businessId"
        WHERE
          s."is_active" = true
          AND b.slug = ${query.slug}
          ${searchFilter}
      `),
    ]);

    const services = rows ?? [];
    const total = Number(countRows[0]?.count ?? 0);

    const items = (services ?? [])?.map((service) => ({
      id: service.id,
      name: service.name,
      duration: formatDuration(service.duration),
      price: new Price(service.price_in_cents).toCurrency(),
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));
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
