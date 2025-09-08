import { PrismaService } from '@app/shared';
import { AppointmentStatusEnum } from '@app/shared/enum';
import { CurrentCustomer } from '@app/shared/types/app-request';
import { formatDuration, getTwoNames } from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GetCustomerAppointmentsDto } from '../dto/requests/get-customer-appointments.dto';

type Row = {
  id: string;
  notes: string | null;
  status: AppointmentStatusEnum;
  scheduled_at: Date;
  professional_name: string;
  service_name: string;
  duration: number;
  price_in_cents: number;
  business_name: string;
};

@Injectable()
export class GetCustomerAppointmentsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(query: GetCustomerAppointmentsDto, user: CurrentCustomer) {
    const { page, limit, search, status } = query;

    const pageNumber = parseInt(String(page), 10) || 1;
    const limitNumber = parseInt(String(limit), 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // Filtros dinâmicos (com Prisma.sql para manter parametrização)
    const statusFilter =
      status && status !== AppointmentStatusEnum.ALL
        ? // $1::"AppointmentStatus" é válido no Postgres
          Prisma.sql`AND a."status" = ${status}::"AppointmentStatus"`
        : Prisma.sql``;

    const searchTrimmed = search?.trim() ?? '';
    const searchFilter =
      searchTrimmed.length > 0
        ? Prisma.sql`AND (
            unaccent(s.name) ILIKE unaccent(${`%${searchTrimmed}%`})
            OR unaccent(COALESCE(a.notes, '')) ILIKE unaccent(${`%${searchTrimmed}%`})
          )`
        : Prisma.sql``;

    // Query de dados
    const appointments = await this.prismaService.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        a.id,
        a.notes,
        a.status,
        a.scheduled_at,
        u.name AS professional_name,
        s.name AS service_name,
        s.duration,
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
      ORDER BY a.scheduled_at DESC
      LIMIT ${limitNumber} OFFSET ${skip}
    `);

    // Count consistente com os mesmos filtros (unaccent + status)
    const countRows = await this.prismaService.$queryRaw<
      { count: bigint }[]
    >(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "Appointment" a
      JOIN "Service" s ON a."service_id" = s.id
      JOIN "ProfessionalProfile" p ON a."professionalProfileId" = p.id
      JOIN "User" u ON p."userId" = u.id
      JOIN "Business" b ON s."businessId" = b.id
      WHERE a."personId" = ${user.personId}
      ${statusFilter}
      ${searchFilter}
    `);

    const totalCount = Number(countRows[0]?.count ?? 0);

    const items = appointments.map((a) => ({
      id: a.id,
      professional: {
        // veio como professional_name do SELECT (u.name)
        name: getTwoNames(a.professional_name),
      },
      service: {
        name: a.service_name,
        duration: formatDuration(a.duration),
        price: new Price(a.price_in_cents).toCurrency(),
      },
      date: {
        day: format(a.scheduled_at, 'dd', { locale: ptBR }),
        month: format(a.scheduled_at, 'MMM', { locale: ptBR }),
        hour: format(a.scheduled_at, 'HH:mm', { locale: ptBR }),
      },
      status: a.status,
      // se quiser expor depois:
      // notes: a.notes,
      // businessName: a.business_name,
    }));

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
