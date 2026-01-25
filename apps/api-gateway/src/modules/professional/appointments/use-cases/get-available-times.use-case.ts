import { CurrentUser } from '@app/shared/types/app-request';
import { parseYmdToTZDate } from '@app/shared/utils';
import { TZDate, tz } from '@date-fns/tz';
import { Injectable } from '@nestjs/common';
import { addDays, format } from 'date-fns';
import { GetAvailableTimesForServiceAndProfessionalUseCase } from '../../../client/business/use-cases/get-available-times-for-service-and-professional.use-case';
import { GetAvailableTimesDto } from '../dto/requests/get-available-times.dto';

const BUSINESS_TZ_ID = 'America/Sao_Paulo';
const IN_TZ = tz(BUSINESS_TZ_ID);

@Injectable()
export class GetAvailableTimesUseCase {
  constructor(
    private readonly getAvailableTimesForServiceAndProfessionalUseCase: GetAvailableTimesForServiceAndProfessionalUseCase,
  ) {}

  async execute(payload: GetAvailableTimesDto, user: CurrentUser) {
    const { service_id, start_date, professional_profile_id } = payload;
    const { current_selected_business_slug } = user;
    const businessSlug = current_selected_business_slug ?? '';

    const startLocalDay0 = parseYmdToTZDate({
      ymd: start_date,
      tzId: BUSINESS_TZ_ID,
    });

    const days: { date: string; availableSlots: string[] }[] = [];

    for (let i = 0; i < 3; i++) {
      const currentDateLocal =
        i === 0 ? startLocalDay0 : (addDays(startLocalDay0, i) as TZDate);
      const dateStr = format(currentDateLocal, 'yyyy-MM-dd', { in: IN_TZ });

      const result =
        await this.getAvailableTimesForServiceAndProfessionalUseCase.execute({
          service_id,
          professional_id: professional_profile_id,
          day: dateStr,
          business_slug: businessSlug,
        });

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
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
        select: {
          start_at_utc: true,
          end_at_utc: true,
          timezone: true,
          duration_minutes: true,
          service: { select: { duration: true } },
        },
        orderBy: { start_at_utc: 'asc' },
      days.push({
        date: result.date,
        availableSlots: result.availableSlots,
      });
    }

    return { days };
  }
}
