import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  formatAppointmentStatus,
  formatDate,
  formatDuration,
  formatPhoneNumber,
  getTwoNames,
} from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { addHours, addMinutes } from 'date-fns';

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

    // 2) Busca agendamentos
    const appointments = await this.prisma.appointment.findMany({
      where: {
        professionalProfileId: prof.id,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      select: {
        id: true,
        notes: true,
        scheduled_at: true,
        status: true,
        customerPerson: { select: { id: true, name: true, phone: true } }, // 👈 Person do cliente
        professional: { select: { User: { select: { name: true } } } },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price_in_cents: true,
          },
        },
      },
      orderBy: { scheduled_at: 'asc' },
    });

    // 3) Mapear personId -> BusinessCustomer.id (no negócio atual) para manter navegação p/ detalhes
    const personIds = Array.from(
      new Set(appointments.map((a) => a.customerPerson.id)),
    );
    const bcs = await this.prisma.businessCustomer.findMany({
      where: {
        personId: { in: personIds },
        businessId: currentUser.current_selected_business_id,
      },
      select: { id: true, personId: true, phone: true }, // phone “sombra” do vínculo, se quiser priorizar
    });
    const bcByPersonId = new Map(bcs.map((b) => [b.personId, b]));

    // 4) Formata saída (prioriza telefone do vínculo; se não houver, usa phone global da Person)
    const formatted = appointments.map((a) => {
      const scheduledAtWithTimezone = addHours(a.scheduled_at, 3);
      const hourStart = formatDate(scheduledAtWithTimezone, 'HH:mm');
      const scheduledEnd = addMinutes(
        scheduledAtWithTimezone,
        a.service.duration,
      );
      const hourEnd = formatDate(scheduledEnd, 'HH:mm');

      const bc = bcByPersonId.get(a.customerPerson.id);
      const phoneRaw = bc?.phone ?? a.customerPerson.phone;

      return {
        id: a.id,
        customer: {
          id: bc?.id ?? null, // 👈 BusinessCustomer.id (para telas de detalhe do cliente no negócio)
          name: a.customerPerson.name,
          phone: phoneRaw ? formatPhoneNumber(phoneRaw) : null,
        },
        notes: a.notes,
        professional: {
          name: getTwoNames(a.professional.User.name),
        },
        start_date: addHours(a.scheduled_at, 3),
        end_date: addHours(
          new Date(a.scheduled_at.getTime() + a.service.duration * 60 * 1000),
          3,
        ),
        date: {
          day: formatDate(a.scheduled_at, 'dd'),
          month: formatDate(a.scheduled_at, 'MMM'),
          hour: hourStart,
          hour_end: hourEnd,
        },
        service: {
          id: a.service.id,
          name: a.service.name,
          duration: formatDuration(Number(a.service.duration), 'short'),
          price_in_formatted: new Price(a.service.price_in_cents).toCurrency(),
        },
        status: formatAppointmentStatus(a.status),
      };
    });

    return formatted;
  }
}
