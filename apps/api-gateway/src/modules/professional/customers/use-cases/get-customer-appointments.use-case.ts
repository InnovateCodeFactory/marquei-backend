import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatAppointmentStatus, getTwoNames } from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { tz } from '@date-fns/tz';
import { Injectable, NotFoundException } from '@nestjs/common';
import { addMinutes, format } from 'date-fns';
import { GetCustomerDetailsDto } from '../dto/requests/get-customer-details.dto';

@Injectable()
export class GetCustomerAppointmentsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id }: GetCustomerDetailsDto, user: CurrentUser) {
    // id = BusinessCustomer.id (vínculo no negócio)
    const bc = await this.prisma.businessCustomer.findUnique({
      where: { id },
      select: { personId: true },
    });
    if (!bc) throw new NotFoundException('Cliente não encontrado');

    const appointments = await this.prisma.appointment.findMany({
      where: {
        personId: bc.personId, // cliente do agendamento
        professional: { business_id: user.current_selected_business_id }, // só do negócio atual
      },
      orderBy: { start_at_utc: 'desc' },
      select: {
        id: true,
        status: true,
        start_at_utc: true,
        end_at_utc: true,
        timezone: true,
        duration_minutes: true,
        professionalProfileId: true,
        service: {
          select: {
            id: true,
            name: true,
            price_in_cents: true,
            duration: true, // fallback
          },
        },
        professional: {
          select: {
            User: { select: { id: true, name: true } },
          },
        },
      },
    });

    const data = appointments.map((appt) => {
      const zoneId = appt.timezone || 'America/Sao_Paulo';
      const IN_TZ = tz(zoneId);

      // duração “fotografada” no appointment (fallback para service.duration)
      const durationMin = appt.duration_minutes ?? appt.service.duration;

      // start/end em UTC -> formatados no fuso local do agendamento
      const hourStart = format(appt.start_at_utc, 'HH:mm', { in: IN_TZ });

      // se tiver end_at_utc usa direto; senão calcula a partir do start + duration
      const endInstant =
        appt.end_at_utc ??
        (addMinutes(appt.start_at_utc, durationMin, { in: IN_TZ }) as Date);
      const hourEnd = format(endInstant, 'HH:mm', { in: IN_TZ });

      return {
        id: appt.id,
        status: formatAppointmentStatus(appt.status),
        status_raw: appt.status,
        date: {
          day: format(appt.start_at_utc, 'dd', { in: IN_TZ }),
          month: format(appt.start_at_utc, 'MMM', { in: IN_TZ }),
          hour: hourStart,
          hour_end: hourEnd,
        },
        service: {
          id: appt.service.id,
          name: appt.service.name,
          price: new Price(appt.service.price_in_cents).toCurrency(),
        },
        professional: {
          id: appt.professional.User.id,
          professional_profile_id: appt.professionalProfileId,
          name: getTwoNames(appt.professional.User.name),
        },
      };
    });

    return data;
  }
}
