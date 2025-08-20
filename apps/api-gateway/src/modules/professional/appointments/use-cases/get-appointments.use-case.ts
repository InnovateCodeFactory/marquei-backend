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
  constructor(private readonly prismaService: PrismaService) {}

  async execute(currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_id)
      throw new UnauthorizedException(
        'You must select a business to view appointments.',
      );

    const currentProfessionalProfile =
      await this.prismaService.professionalProfile.findFirst({
        where: {
          userId: currentUser.id,
          business_id: currentUser.current_selected_business_id,
        },
        select: {
          id: true,
        },
      });

    if (!currentProfessionalProfile)
      throw new UnauthorizedException(
        'You must have a professional profile to view appointments.',
      );

    const appointments = await this.prismaService.appointment.findMany({
      where: {
        professionalProfileId: currentProfessionalProfile.id,
        status: {
          in: ['CONFIRMED', 'PENDING'],
        },
      },
      select: {
        id: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        notes: true,
        professional: {
          select: {
            User: {
              select: {
                name: true,
              },
            },
          },
        },
        scheduled_at: true,
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price_in_cents: true,
          },
        },
        status: true,
      },
      orderBy: {
        scheduled_at: 'asc',
      },
    });

    const formattedAppointments = appointments.map((appointment) => {
      const scheduledAtWithTimezone = addHours(appointment.scheduled_at, 3);
      const hourStart = formatDate(scheduledAtWithTimezone, 'HH:mm');

      const scheduledEnd = addMinutes(
        scheduledAtWithTimezone,
        appointment.service.duration,
      );
      const hourEnd = formatDate(scheduledEnd, 'HH:mm');

      return {
        id: appointment.id,
        customer: {
          id: appointment.customer.id,
          name: appointment.customer.name,
          phone: formatPhoneNumber(appointment.customer.phone),
        },
        notes: appointment.notes,
        professional: {
          name: getTwoNames(appointment.professional.User.name),
        },
        start_date: addHours(appointment.scheduled_at, 3),
        end_date: addHours(
          new Date(
            appointment.scheduled_at.getTime() +
              appointment.service.duration * 60 * 1000, // duration in minutes
          ),
          3,
        ),
        date: {
          day: formatDate(appointment.scheduled_at, 'dd'),
          month: formatDate(appointment.scheduled_at, 'MMM'),
          hour: hourStart,
          hour_end: hourEnd,
        },
        service: {
          id: appointment.service.id,
          name: appointment.service.name,
          duration: formatDuration(
            Number(appointment.service.duration),
            'short',
          ),
          price_in_formatted: new Price(
            appointment.service.price_in_cents,
          ).toCurrency(),
        },
        status: formatAppointmentStatus(appointment.status),
      };
    });
    return formattedAppointments;
  }
}
