import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  formatAppointmentStatus,
  formatDuration,
  formatPhoneNumber,
  getTwoNames,
} from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { tz } from '@date-fns/tz';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { addMinutes, format } from 'date-fns';

@Injectable()
export class GetAppointmentsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_id) {
      throw new UnauthorizedException(
        'You must select a business to view appointments.',
      );
    }

    // 1) Perfil profissional do usuário no negócio atual
    const prof = await this.prisma.professionalProfile.findFirst({
      where: {
        userId: currentUser.id,
        business_id: currentUser.current_selected_business_id,
      },
      select: { id: true },
    });
    if (!prof) {
      throw new UnauthorizedException(
        'You must have a professional profile to view appointments.',
      );
    }

    // 2) Busca agendamentos (novo esquema UTC)
    const appointments = await this.prisma.appointment.findMany({
      where: {
        professionalProfileId: prof.id,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      select: {
        id: true,
        notes: true,
        status: true,

        // UTC + contexto
        start_at_utc: true,
        end_at_utc: true,
        timezone: true,
        duration_minutes: true,

        customerPerson: { select: { id: true, name: true, phone: true } },
        professional: {
          select: { User: { select: { name: true, id: true } } },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true, // fallback se não houver duration_minutes
            price_in_cents: true,
          },
        },
      },
      orderBy: { start_at_utc: 'asc' },
    });

    // 3) Mapear personId -> BusinessCustomer.id (no negócio atual)
    const personIds = Array.from(
      new Set(appointments.map((a) => a.customerPerson.id)),
    );
    const bcs = await this.prisma.businessCustomer.findMany({
      where: {
        personId: { in: personIds },
        businessId: currentUser.current_selected_business_id,
      },
      select: { id: true, personId: true, phone: true },
    });
    const bcByPersonId = new Map(bcs.map((b) => [b.personId, b]));

    // 4) Formatação com timezone do agendamento
    const formatted = appointments.map((a) => {
      const zoneId = a.timezone || 'America/Sao_Paulo';
      const IN_TZ = tz(zoneId);

      const durationMin = a.duration_minutes ?? a.service.duration;

      const startUtc = a.start_at_utc;
      const endUtc =
        a.end_at_utc ?? (addMinutes(startUtc, durationMin) as Date);

      const hourStart = format(startUtc, 'HH:mm', { in: IN_TZ });
      const hourEnd = format(endUtc, 'HH:mm', { in: IN_TZ });

      const bc = bcByPersonId.get(a.customerPerson.id);
      const phoneRaw = bc?.phone ?? a.customerPerson.phone;

      return {
        id: a.id,

        customer: {
          id: bc?.id ?? null, // BusinessCustomer.id para telas de detalhe
          name: a.customerPerson.name,
          phone: phoneRaw ? formatPhoneNumber(phoneRaw) : null,
        },

        notes: a.notes,

        professional: {
          id: a.professional.User.id,
          name: getTwoNames(a.professional.User.name),
        },

        // Instantes corretos em UTC (o front pode formatar no fuso se precisar)
        start_date: startUtc,
        end_date: endUtc,

        // Labels já prontos no fuso do agendamento
        date: {
          day: format(startUtc, 'dd', { in: IN_TZ }),
          month: format(startUtc, 'MMM', { in: IN_TZ }),
          hour: hourStart,
          hour_end: hourEnd,
        },

        service: {
          id: a.service.id,
          name: a.service.name,
          duration: formatDuration(Number(durationMin), 'short'),
          price_in_formatted: new Price(a.service.price_in_cents).toCurrency(),
        },

        status: formatAppointmentStatus(a.status),
      };
    });

    return formatted;
  }
}
