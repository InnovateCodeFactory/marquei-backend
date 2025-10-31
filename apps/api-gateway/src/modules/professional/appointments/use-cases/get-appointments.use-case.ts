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
import {
  addDays,
  addMinutes,
  max as dfMax,
  min as dfMin,
  endOfDay,
  format,
  isBefore,
  startOfDay,
} from 'date-fns';
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
          },
        },
      },
      orderBy: { start_at_utc: 'asc' },
    });

    // 2.1) Buscar bloqueios do profissional
    const blocksRaw = await this.prisma.professionalTimesBlock.findMany({
      where: {
        professionalProfileId: prof.id,
      },
      select: {
        start_at_utc: true,
        end_at_utc: true,
        timezone: true,
      },
      orderBy: {
        start_at_utc: 'asc',
      },
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

    // 4) Formatar agendamentos
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
          id: a.service.id,
          name: a.service.name,
          duration: formatDuration(Number(durationMin), 'short'),
          price_in_formatted: new Price(a.service.price_in_cents).toCurrency(),
        },
        status: formatAppointmentStatus(a.status),
      };
    });

    // 5) Converter bloqueios pro formato do CalendarKit
    const unavailableHours = this.buildUnavailableByDay(blocksRaw);

    return {
      items: formattedItems,
      unavailableHours,
    };
  }

  private buildUnavailableByDay(
    blocks: {
      start_at_utc: Date;
      end_at_utc: Date;
      timezone?: string | null;
    }[],
  ): Record<string, { start: number; end: number }[]> {
    const result: Record<string, { start: number; end: number }[]> = {};

    for (const block of blocks) {
      const zone = block.timezone || 'America/Sao_Paulo';
      const IN_TZ = tz(zone);

      const blockStart = block.start_at_utc;
      const blockEnd = block.end_at_utc;

      // percorre cada dia coberto pelo bloqueio
      let cursorDay = startOfDay(blockStart);
      while (isBefore(cursorDay, blockEnd)) {
        // pega o trecho do bloqueio dentro desse dia
        const daySliceStart = dfMax([blockStart, startOfDay(cursorDay)]);
        const daySliceEnd = dfMin([blockEnd, endOfDay(cursorDay)]);

        // horário local desse recorte
        const startLocal = format(daySliceStart, 'HH:mm', { in: IN_TZ });
        const endLocal = format(daySliceEnd, 'HH:mm', { in: IN_TZ });

        const [sh, sm] = startLocal.split(':').map(Number);
        const [eh, em] = endLocal.split(':').map(Number);

        // converte para minutos (CalendarKit espera minutos)
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;

        // chave do dia no fuso do bloqueio
        const dayKey = format(cursorDay, 'yyyy-MM-dd', { in: IN_TZ });

        if (!result[dayKey]) {
          result[dayKey] = [];
        }

        result[dayKey].push({
          start: startMinutes,
          end: endMinutes,
        });

        cursorDay = addDays(cursorDay, 1);
      }
    }

    return result;
  }
}
