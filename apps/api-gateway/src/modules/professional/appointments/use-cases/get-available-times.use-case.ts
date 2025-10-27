import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { parseYmdToTZDate } from '@app/shared/utils';
import { TZDate, tz } from '@date-fns/tz';
import { Injectable } from '@nestjs/common';
import {
  addDays,
  addMinutes,
  areIntervalsOverlapping,
  endOfDay,
  format,
  isBefore,
  isEqual,
  startOfDay,
} from 'date-fns';
import { GetAvailableTimesDto } from '../dto/requests/get-available-times.dto';

type OpeningHours = {
  day: string; // 'MONDAY', 'TUESDAY', ...
  closed: boolean;
  times?: { startTime: string; endTime: string }[]; // 'HH:mm'
}[];

const BUSINESS_TZ_ID = 'America/Sao_Paulo';
const IN_TZ = tz(BUSINESS_TZ_ID);

@Injectable()
export class GetAvailableTimesUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: GetAvailableTimesDto, user: CurrentUser) {
    const { service_id, start_date, professional_id } = payload;
    const { current_selected_business_slug } = user;

    // Dados básicos
    const [service, business] = await Promise.all([
      this.prismaService.service.findUnique({
        where: { id: service_id },
        select: { duration: true },
      }),
      this.prismaService.business.findUnique({
        where: { slug: current_selected_business_slug },
        select: { opening_hours: true, id: true },
      }),
    ]);
    if (!service) throw new Error('Serviço não encontrado');
    if (!business) throw new Error('Negócio não encontrado');

    // Opening hours
    let openingHours: OpeningHours =
      typeof business.opening_hours === 'string'
        ? JSON.parse(business.opening_hours)
        : (business.opening_hours as OpeningHours);

    const startLocalDay0 = parseYmdToTZDate({
      ymd: start_date,
      tzId: BUSINESS_TZ_ID,
    });

    const days: { date: string; availableSlots: string[] }[] = [];

    for (let i = 0; i < 3; i++) {
      // Dia local corrente (TZDate)
      const currentDateLocal =
        i === 0 ? startLocalDay0 : (addDays(startLocalDay0, i) as TZDate);
      const dateStr = format(currentDateLocal, 'yyyy-MM-dd', { in: IN_TZ });
      const weekday = format(currentDateLocal, 'EEEE', {
        in: IN_TZ,
      }).toUpperCase();

      const dayConfig = openingHours.find((d) => d.day === weekday);

      if (!dayConfig || dayConfig.closed || !dayConfig.times?.length) {
        days.push({ date: dateStr, availableSlots: [] });
        continue;
      }

      // Agora no fuso local
      const nowLocal = new TZDate(new Date(), BUSINESS_TZ_ID);
      const isTodayLocal =
        format(currentDateLocal, 'yyyy-MM-dd', { in: IN_TZ }) ===
        format(nowLocal, 'yyyy-MM-dd', { in: IN_TZ });

      // Gera candidatos locais
      const slotStartsLocal: TZDate[] = [];
      for (const t of dayConfig.times) {
        const [sh, sm] = t.startTime.split(':').map(Number);
        const [eh, em] = t.endTime.split(':').map(Number);

        let startLocal = new TZDate(
          currentDateLocal.getFullYear(),
          currentDateLocal.getMonth(),
          currentDateLocal.getDate(),
          sh,
          sm ?? 0,
          0,
          BUSINESS_TZ_ID,
        );
        const endLocal = new TZDate(
          currentDateLocal.getFullYear(),
          currentDateLocal.getMonth(),
          currentDateLocal.getDate(),
          eh,
          em ?? 0,
          0,
          BUSINESS_TZ_ID,
        );

        while (
          isBefore(addMinutes(startLocal, service.duration), endLocal) ||
          isEqual(addMinutes(startLocal, service.duration), endLocal)
        ) {
          if (!isTodayLocal || isBefore(nowLocal, startLocal)) {
            slotStartsLocal.push(startLocal);
          }
          startLocal = addMinutes(startLocal, service.duration) as TZDate;
        }
      }

      if (slotStartsLocal.length === 0) {
        days.push({ date: dateStr, availableSlots: [] });
        continue;
      }

      // Janela local do dia → UTC (para buscar no banco)
      const dayStartLocal = startOfDay(currentDateLocal) as TZDate;
      const dayEndLocal = endOfDay(currentDateLocal) as TZDate;
      const dayStartUtc: Date = new Date(dayStartLocal);
      const dayEndUtc: Date = new Date(dayEndLocal);

      // Busca appointments que INTERSECTAM o dia (em UTC)
      const appointments = await this.prismaService.appointment.findMany({
        where: {
          professionalProfileId: professional_id,
          start_at_utc: { lt: dayEndUtc },
          end_at_utc: { gt: dayStartUtc },
        },
        select: {
          start_at_utc: true,
          end_at_utc: true,
          timezone: true,
          duration_minutes: true,
          service: { select: { duration: true } },
        },
        orderBy: { start_at_utc: 'asc' },
      });

      // Bloqueios de horários que INTERSECTAM o dia (em UTC)
      const blocks = await this.prismaService.professionalTimesBlock.findMany({
        where: {
          professionalProfileId: professional_id,
          start_at_utc: { lt: dayEndUtc },
          end_at_utc: { gt: dayStartUtc },
        },
        select: {
          start_at_utc: true,
          end_at_utc: true,
          timezone: true,
        },
        orderBy: { start_at_utc: 'asc' },
      });

      // Ranges ocupados em horário LOCAL (usar TZ do registro se existir)
      const busyRangesLocal = [
        // appointments
        ...appointments.map((appt) => {
          const apptZone = appt.timezone || BUSINESS_TZ_ID;
          const apptIn = tz(apptZone);
          const startLocal = new TZDate(appt.start_at_utc, apptZone);
          const endLocal = appt.end_at_utc
            ? new TZDate(appt.end_at_utc, apptZone)
            : (addMinutes(
                startLocal,
                appt.duration_minutes ?? appt.service.duration,
                { in: apptIn },
              ) as TZDate);
          return { start: startLocal, end: endLocal };
        }),
        // blocks
        ...blocks.map((b) => {
          const z = b.timezone || BUSINESS_TZ_ID;
          return {
            start: new TZDate(b.start_at_utc, z),
            end: new TZDate(b.end_at_utc, z),
          };
        }),
      ];

      // Filtra slots removendo overlaps (comparação 100% local)
      const availableSlots = slotStartsLocal
        .filter((slotStartLocal) => {
          const slotEndLocal = addMinutes(
            slotStartLocal,
            service.duration,
          ) as TZDate;
          return !busyRangesLocal.some((b) =>
            areIntervalsOverlapping(
              { start: slotStartLocal, end: slotEndLocal },
              b,
              { inclusive: false },
            ),
          );
        })
        .map((slot) => format(slot, 'HH:mm', { in: IN_TZ }));

      days.push({ date: dateStr, availableSlots });
    }

    return { days };
  }
}
