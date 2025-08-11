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
    if (!currentUser?.current_selected_business_id)
      throw new UnauthorizedException(
        'You must select a business to view appointments.',
      );

    // Agora encontramos o perfil profissional pela AuthAccount -> PersonAccount -> Person
    const currentProfessionalProfile =
      await this.prisma.professionalProfile.findFirst({
        where: {
          business_id: currentUser.current_selected_business_id,
          person: {
            personAccount: {
              authAccountId: currentUser.id, // id da AuthAccount no JWT
            },
          },
        },
        select: { id: true },
      });

    if (!currentProfessionalProfile)
      throw new UnauthorizedException(
        'You must have a professional profile to view appointments.',
      );

    const appointments = await this.prisma.appointment.findMany({
      where: {
        professionalProfileId: currentProfessionalProfile.id,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      select: {
        id: true,
        notes: true,
        scheduled_at: true,
        status: true,
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price_in_cents: true,
          },
        },
        customer: {
          // CustomerProfile -> Person (pega name/phone do cliente)
          select: {
            id: true,
            person: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
        professional: {
          // ProfessionalProfile -> Person (pega nome do profissional)
          select: {
            person: {
              select: { name: true },
            },
          },
        },
      },
    });

    const formatted = appointments.map((a) => {
      // mantendo o offset +3h que você já aplicava
      const scheduledAtWithTimezone = addHours(a.scheduled_at, 3);
      const hourStart = formatDate(scheduledAtWithTimezone, 'HH:mm');

      const scheduledEnd = addMinutes(
        scheduledAtWithTimezone,
        a.service.duration,
      );
      const hourEnd = formatDate(scheduledEnd, 'HH:mm');

      return {
        id: a.id,
        customer: {
          id: a.customer.id,
          name: a.customer.person.name,
          phone: formatPhoneNumber(a.customer.person.phone),
        },
        notes: a.notes,
        professional: {
          name: getTwoNames(a.professional.person.name),
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
