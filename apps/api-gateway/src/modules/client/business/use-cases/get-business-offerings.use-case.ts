import { PrismaService } from '@app/shared';
import { formatDuration } from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  BusinessOfferingType,
  GetBusinessOfferingsDto,
} from '../dto/requests/get-business-offerings.dto';

type OfferingItem = {
  id: string;
  name: string;
  duration: string;
  price: string;
  base_price?: string | null;
  kind: BusinessOfferingType;
  is_bookable: boolean;
  discount_percent?: number | null;
};

@Injectable()
export class GetBusinessOfferingsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(query: GetBusinessOfferingsDto) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const type = (query.type ?? 'SERVICE') as BusinessOfferingType;
    const searchTrimmed = (query.search ?? '').trim();
    const escaped = searchTrimmed.replace(/[%_]/g, '\\$&');
    const searchLike = `%${escaped}%`;
    const searchDigits = searchTrimmed.replace(/\D/g, '');
    const numericSearch = Number.parseInt(searchDigits, 10);
    const decimalSearch = Number.parseFloat(
      searchTrimmed.replace(/\./g, '').replace(',', '.'),
    );
    const priceInCentsFromDecimal = Number.isFinite(decimalSearch)
      ? Math.round(decimalSearch * 100)
      : null;

    if (type === 'PACKAGE') {
      return {
        type,
        items: [] as OfferingItem[],
        page,
        limit,
        total: 0,
        totalPages: 1,
        hasMorePages: false,
      };
    }

    if (type === 'COMBO') {
      type ComboRow = {
        id: string;
        name: string;
        final_duration_minutes: number;
        final_price_in_cents: number;
        base_price_in_cents: number;
        discount_percent: number | null;
        is_bookable: boolean;
      };

      const digitsFilter =
        searchDigits.length > 0
          ? Prisma.sql`OR c."final_price_in_cents"::text ILIKE ${`%${searchDigits}%`} ESCAPE '\\'`
          : Prisma.sql``;

      const searchFilter =
        escaped.length > 0
          ? Prisma.sql`
              AND (
                unaccent(c."name") ILIKE unaccent(${searchLike}) ESCAPE '\\'
                OR c."final_duration_minutes"::text ILIKE ${searchLike} ESCAPE '\\'
                ${digitsFilter}
                OR (${Number.isFinite(numericSearch)} AND (
                  c."final_duration_minutes" = ${Number.isFinite(numericSearch) ? numericSearch : -1}
                  OR c."final_price_in_cents" = ${Number.isFinite(numericSearch) ? numericSearch : -1}
                ))
                OR (${priceInCentsFromDecimal !== null} AND c."final_price_in_cents" = ${priceInCentsFromDecimal ?? -1})
              )
            `
          : Prisma.sql``;

      const [rows, countRows] = await Promise.all([
        this.prismaService.$queryRaw<ComboRow[]>(Prisma.sql`
          SELECT
            c.id,
            c."name",
            c."final_duration_minutes",
            c."final_price_in_cents",
            c."base_price_in_cents",
            c."discount_percent",
            EXISTS (
              SELECT 1
              FROM "ProfessionalServiceCombo" psc
              JOIN "ProfessionalProfile" pp ON pp.id = psc."professional_profile_id"
              WHERE
                psc."service_combo_id" = c.id
                AND psc."active" = true
                AND pp."status" = 'ACTIVE'
            ) AS is_bookable
          FROM "ServiceCombo" c
          JOIN "Business" b ON b.id = c."businessId"
          WHERE
            c."is_active" = true
            AND c."deleted_at" IS NULL
            AND b.slug = ${query.slug}
            AND (
              SELECT COUNT(*)::int
              FROM "ServiceComboItem" sci
              JOIN "Service" s ON s.id = sci."serviceId"
              WHERE sci."comboId" = c.id AND s."is_active" = true
            ) >= 2
            ${searchFilter}
          ORDER BY c."updated_at" DESC
          LIMIT ${limit} OFFSET ${skip}
        `),
        this.prismaService.$queryRaw<{ count: bigint }[]>(Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM "ServiceCombo" c
          JOIN "Business" b ON b.id = c."businessId"
          WHERE
            c."is_active" = true
            AND c."deleted_at" IS NULL
            AND b.slug = ${query.slug}
            AND (
              SELECT COUNT(*)::int
              FROM "ServiceComboItem" sci
              JOIN "Service" s ON s.id = sci."serviceId"
              WHERE sci."comboId" = c.id AND s."is_active" = true
            ) >= 2
            ${searchFilter}
        `),
      ]);

      const total = Number(countRows[0]?.count ?? 0);
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const items: OfferingItem[] = (rows ?? []).map((combo) => {
        const hasRealDiscount =
          combo.base_price_in_cents > combo.final_price_in_cents;
        const computedDiscountPercent =
          combo.base_price_in_cents > 0 && hasRealDiscount
            ? Math.round(
                ((combo.base_price_in_cents - combo.final_price_in_cents) /
                  combo.base_price_in_cents) *
                  100,
              )
            : 0;

        return {
          id: combo.id,
          name: combo.name,
          duration: formatDuration(combo.final_duration_minutes),
          price: new Price(combo.final_price_in_cents).toCurrency(),
          base_price: hasRealDiscount
            ? new Price(combo.base_price_in_cents).toCurrency()
            : null,
          kind: 'COMBO',
          is_bookable: combo.is_bookable,
          discount_percent: hasRealDiscount
            ? Math.max(0, combo.discount_percent ?? computedDiscountPercent)
            : null,
        };
      });

      return {
        type,
        items,
        page,
        limit,
        total,
        totalPages,
        hasMorePages: page < totalPages,
      };
    }

    type ServiceRow = {
      id: string;
      name: string;
      duration: number;
      price_in_cents: number;
    };

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

    const total = Number(countRows[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const items: OfferingItem[] = (rows ?? []).map((service) => ({
      id: service.id,
      name: service.name,
      duration: formatDuration(service.duration),
      price: new Price(service.price_in_cents).toCurrency(),
      kind: 'SERVICE',
      is_bookable: true,
      discount_percent: null,
    }));

    return {
      type,
      items,
      page,
      limit,
      total,
      totalPages,
      hasMorePages: page < totalPages,
    };
  }
}
