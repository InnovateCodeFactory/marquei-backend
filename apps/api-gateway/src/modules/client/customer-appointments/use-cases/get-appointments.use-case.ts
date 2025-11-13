import { PrismaService } from '@app/shared';
import { AppointmentStatusEnum } from '@app/shared/enum';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatDuration, getTwoNames } from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { tz } from '@date-fns/tz';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GetCustomerAppointmentsDto } from '../dto/requests/get-customer-appointments.dto';

type Row = {
  id: string;
  notes: string | null;
  status: AppointmentStatusEnum;

  start_at_utc: Date;
  end_at_utc: Date | null; // se você sempre preencher, pode ser Date
  duration_minutes: number | null; // fallback para s.duration se null
  timezone: string | null; // fallback "America/Sao_Paulo"

  professional_name: string;
  service_name: string;
  service_duration: number; // s.duration (fallback)
  price_in_cents: number;
  business_name: string;
};

@Injectable()
export class GetCustomerAppointmentsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(query: GetCustomerAppointmentsDto, user: CurrentUser) {
    const { page, limit, search, status } = query;

    const pageNumber = parseInt(String(page), 10) || 1;
    const limitNumber = parseInt(String(limit), 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // Filtros dinâmicos
    const statusFilter =
      status && status !== AppointmentStatusEnum.ALL
        ? Prisma.sql`AND a."status" = ${status}::"AppointmentStatus"`
        : Prisma.sql``;

    const searchTrimmed = search?.trim() ?? '';
    const searchFilter =
      searchTrimmed.length > 0
        ? Prisma.sql`AND (
            unaccent(s.name) ILIKE unaccent(${`%${searchTrimmed}%`})
            OR unaccent(COALESCE(a.notes, '')) ILIKE unaccent(${`%${searchTrimmed}%`})
          )`
        : Prisma.sql``;

    // Query principal
    const appointments = await this.prismaService.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        a.id,
        a.notes,
        a.status,
        a.start_at_utc,
        a.end_at_utc,
        a.duration_minutes,
        a.timezone,
        u.name AS professional_name,
        s.name AS service_name,
        s.duration AS service_duration,
        s.price_in_cents,
        b.name AS business_name
      FROM "Appointment" a
      JOIN "Service" s ON a."service_id" = s.id
      JOIN "ProfessionalProfile" p ON a."professionalProfileId" = p.id
      JOIN "User" u ON p."userId" = u.id
      JOIN "Business" b ON s."businessId" = b.id
      WHERE a."personId" = ${user.personId}
      ${statusFilter}
      ${searchFilter}
      ORDER BY a.start_at_utc DESC
      LIMIT ${limitNumber} OFFSET ${skip}
    `);

    // Count com mesmos filtros
    const countRows = await this.prismaService.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "Appointment" a
        JOIN "Service" s ON a."service_id" = s.id
        JOIN "ProfessionalProfile" p ON a."professionalProfileId" = p.id
        JOIN "User" u ON p."userId" = u.id
        JOIN "Business" b ON s."businessId" = b.id
        WHERE a."personId" = ${user.personId}
        ${statusFilter}
        ${searchFilter}
      `,
    );

    const totalCount = Number(countRows[0]?.count ?? 0);

    const items = appointments.map((a) => {
      const zoneId = a.timezone || 'America/Sao_Paulo';
      const IN_TZ = tz(zoneId);

      // duração “fotografada” no appointment (fallback para service.duration)
      const durationMin = a.duration_minutes ?? a.service_duration;

      return {
        id: a.id,
        professional: {
          name: getTwoNames(a.professional_name),
        },
        service: {
          name: a.service_name,
          duration: formatDuration(durationMin),
          price: new Price(a.price_in_cents).toCurrency(),
        },
        date: {
          day: format(a.start_at_utc, 'dd', { locale: ptBR, in: IN_TZ }),
          month: format(a.start_at_utc, 'MMM', { locale: ptBR, in: IN_TZ }),
          hour: format(a.start_at_utc, 'HH:mm', { locale: ptBR, in: IN_TZ }),
        },
        status: a.status,
        business_name: a.business_name,
        // se quiser expor depois:
        // notes: a.notes,
        // end_local: format(a.end_at_utc ?? addMinutes(a.start_at_utc, durationMin) as Date, 'HH:mm', { in: IN_TZ }),
      };
    });

    return {
      items,
      totalCount,
      page: pageNumber,
      limit: limitNumber,
      hasMorePages: totalCount > skip + limitNumber,
      totalPages: Math.ceil(totalCount / limitNumber),
    };
  }
}
