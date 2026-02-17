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
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  addDays,
  addMinutes,
  max as dfMax,
  min as dfMin,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';
import { GetAppointmentsDto } from '../dto/requests/get-appointments.dto';

@Injectable()
export class GetAppointmentsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(currentUser: CurrentUser, query?: GetAppointmentsDto) {
    if (!currentUser?.current_selected_business_id) {
      throw new UnauthorizedException(
        'You must select a business to view appointments.',
      );
    }

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

    const { startDate, endDate } = this.parseDateRange(query);

    // Busca agendamentos
    const appointments = await this.prisma.appointment.findMany({
      where: {
        professionalProfileId: prof.id,
        status: { in: ['CONFIRMED', 'PENDING'] },
        ...(startDate || endDate
          ? {
              start_at_utc: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        professionalProfileId: true,
        notes: true,
        status: true,
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
            duration: true,
            price_in_cents: true,
            color: true,
          },
        },
        serviceCombo: {
          select: {
            id: true,
            name: true,
            final_price_in_cents: true,
            color: true,
          },
        },
      },
      orderBy: { start_at_utc: 'asc' },
    });

    const appointmentIds = appointments.map((appointment) => appointment.id);
    const reminders = appointmentIds.length
      ? await this.prisma.appointmentEvent.findMany({
          where: {
            appointmentId: { in: appointmentIds },
            event_type: 'REMINDER_SENT',
            by_professional: true,
          },
          select: { appointmentId: true },
        })
      : [];
    const reminderByAppointment = new Set(
      reminders.map((reminder) => reminder.appointmentId),
    );

    // Busca bloqueios do profissional (incluindo o ID)
    const blocksRaw = await this.prisma.professionalTimesBlock.findMany({
      where: {
        professionalProfileId: prof.id,
        businessId: currentUser.current_selected_business_id,
        ...(startDate ? { end_at_utc: { gte: startDate } } : {}),
        ...(endDate ? { start_at_utc: { lte: endDate } } : {}),
      },
      select: {
        start_at_utc: true,
        end_at_utc: true,
        timezone: true,
        professionalProfileId: true,
      },
      orderBy: { start_at_utc: 'asc' },
    });

    // Mapear personId → BusinessCustomer.id
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

    // Formatar agendamentos
    const formattedItems = appointments.map((a) => {
      const zoneId = a.timezone || 'America/Sao_Paulo';
      const IN_TZ = tz(zoneId);

      const durationMin = a.duration_minutes ?? a.service.duration;
      const startUtc = a.start_at_utc;
      const endUtc = a.end_at_utc ?? addMinutes(startUtc, durationMin);

      const hourStart = format(startUtc, 'HH:mm', { in: IN_TZ });
      const hourEnd = format(endUtc, 'HH:mm', { in: IN_TZ });

      const bc = bcByPersonId.get(a.customerPerson.id);
      const phoneRaw = bc?.phone ?? a.customerPerson.phone;

      return {
        id: a.id,
        customer: {
          id: bc?.id ?? null,
          name: a.customerPerson.name,
          phone: phoneRaw ? formatPhoneNumber(phoneRaw) : null,
        },
        notes: a.notes,
        professional: {
          id: a.professional.User.id,
          professional_profile_id: a.professionalProfileId,
          name: getTwoNames(a.professional.User.name),
        },
        start_date: startUtc,
        end_date: endUtc,
        date: {
          day: format(startUtc, 'dd', { in: IN_TZ }),
          month: format(startUtc, 'MMM', { in: IN_TZ }),
          hour: hourStart,
          hour_end: hourEnd,
        },
        service: {
          id: a.serviceCombo?.id ?? a.service.id,
          name: a.serviceCombo?.name ?? a.service.name,
          duration: formatDuration(Number(durationMin), 'short'),
          price_in_formatted: new Price(
            a.serviceCombo?.final_price_in_cents ?? a.service.price_in_cents,
          ).toCurrency(),
          color: a.serviceCombo?.color ?? a.service.color,
        },
        status: formatAppointmentStatus(a.status),
        reminder_sent_by_professional: reminderByAppointment.has(a.id),
      };
    });

    // Converter bloqueios com resourceId
    const unavailableHours = this.buildUnavailableByDay(blocksRaw);

    return {
      items: formattedItems,
      unavailableHours,
    };
  }

  private parseDateRange(query?: GetAppointmentsDto): {
    startDate?: Date;
    endDate?: Date;
  } {
    if (!query?.start_date && !query?.end_date) {
      return {};
    }

    const startDate = query?.start_date
      ? parseISO(query.start_date)
      : undefined;
    const endDate = query?.end_date ? parseISO(query.end_date) : undefined;

    if (startDate && !isValid(startDate)) {
      throw new BadRequestException('Invalid start_date.');
    }

    if (endDate && !isValid(endDate)) {
      throw new BadRequestException('Invalid end_date.');
    }

    if (startDate && endDate && isAfter(startDate, endDate)) {
      throw new BadRequestException('start_date must be before end_date.');
    }

    return { startDate, endDate };
  }

  private buildUnavailableByDay(
    blocks: {
      start_at_utc: Date;
      end_at_utc: Date;
      timezone?: string | null;
      professionalProfileId: string;
    }[],
  ): Record<string, { start: number; end: number; resourceId: string }[]> {
    const result: Record<
      string,
      { start: number; end: number; resourceId: string }[]
    > = {};

    for (const block of blocks) {
      const zone = block.timezone || 'America/Sao_Paulo';
      const IN_TZ = tz(zone);

      const blockStart = block.start_at_utc;
      const blockEnd = block.end_at_utc;

      let cursorDay = startOfDay(blockStart);
      while (isBefore(cursorDay, blockEnd)) {
        const daySliceStart = dfMax([blockStart, startOfDay(cursorDay)]);
        const daySliceEnd = dfMin([blockEnd, endOfDay(cursorDay)]);

        const startLocal = format(daySliceStart, 'HH:mm', { in: IN_TZ });
        const endLocal = format(daySliceEnd, 'HH:mm', { in: IN_TZ });

        const [sh, sm] = startLocal.split(':').map(Number);
        const [eh, em] = endLocal.split(':').map(Number);

        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;

        const dayKey = format(cursorDay, 'yyyy-MM-dd', { in: IN_TZ });

        if (!result[dayKey]) {
          result[dayKey] = [];
        }

        result[dayKey].push({
          start: startMinutes,
          end: endMinutes,
          resourceId: block.professionalProfileId,
        });

        cursorDay = addDays(cursorDay, 1);
      }
    }

    return result;
  }
}
