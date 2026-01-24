import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { parseYmdToTZDate } from '@app/shared/utils';
import { TZDate } from '@date-fns/tz';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { addDays, eachDayOfInterval, format, startOfDay } from 'date-fns';
import { BlockTimesDto } from '../dto/requests/block-times.dto';

const BUSINESS_TZ_ID = 'America/Sao_Paulo';

type Interval = {
  startUtc: Date;
  endUtc: Date;
  startLocal: TZDate;
  endLocal: TZDate;
  startLocalISO: string;
  endLocalISO: string;
  isAllDay: boolean;
};

@Injectable()
export class BlockTimesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(payload: BlockTimesDto, req: AppRequest) {
    const { user } = req;
    if (!user?.current_selected_business_id) {
      throw new UnauthorizedException('User not authorized');
    }
    const { professional_profile_id } = user;
    const { start_date, end_date, all_day, start_time, end_time } = payload;

    const professional = await this.prisma.professionalProfile.findFirst({
      where: {
        id: professional_profile_id,
        business_id: user.current_selected_business_id,
      },
      select: { id: true, User: { select: { id: true, name: true } } },
    });

    if (!professional) {
      throw new UnauthorizedException(
        'O profissional não pertence ao negócio selecionado',
      );
    }

    // 2) Parse datas locais (yyyy-MM-dd)
    const dayStartLocal = parseYmdToTZDate({
      ymd: start_date,
      tzId: BUSINESS_TZ_ID,
    });

    const dayEndLocal = end_date
      ? parseYmdToTZDate({
          ymd: end_date,
          tzId: BUSINESS_TZ_ID,
        })
      : dayStartLocal;

    if (dayEndLocal < dayStartLocal) {
      throw new BadRequestException(
        'A data de fim deve ser maior ou igual a data de início',
      );
    }

    // 3) Geração dos intervalos locais por dia
    const days = eachDayOfInterval({ start: dayStartLocal, end: dayEndLocal });

    const intervals: Interval[] = this.getIntervals({
      days,
      all_day,
      start_time,
      end_time,
    });

    // 4) Checar conflito com appointments existentes (UTC)
    for (const itv of intervals) {
      const overlapping = await this.prisma.appointment.findFirst({
        where: {
          professionalProfileId: professional_profile_id,
          start_at_utc: { lt: itv.endUtc },
          end_at_utc: { gt: itv.startUtc },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
        select: { id: true },
      });

      if (overlapping) {
        throw new BadRequestException(
          'Existe(m) agendamento(s) existentes no período. Desmarque os serviços antes de bloquear este horário.',
        );
      }
    }

    // 5) Checar conflito com bloqueios já existentes (UTC)
    for (const itv of intervals) {
      const blockOverlap = await this.prisma.professionalTimesBlock.findFirst({
        where: {
          professionalProfileId: professional_profile_id,
          start_at_utc: { lt: itv.endUtc },
          end_at_utc: { gt: itv.startUtc },
        },
        select: { id: true },
      });
      if (blockOverlap) {
        throw new BadRequestException(
          'Já existe um bloqueio que conflita com este período.',
        );
      }
    }

    // 6) Persistir
    await this.prisma.professionalTimesBlock.createMany({
      data: intervals.map((i) => ({
        professionalProfileId: professional_profile_id!,
        businessId: user.current_selected_business_id!,
        is_all_day: i.isAllDay,
        start_at_utc: i.startUtc,
        end_at_utc: i.endUtc,
        timezone: BUSINESS_TZ_ID,
        start_offset_minutes: i.startLocal.getTimezoneOffset(),
      })),
    });

    return null;
  }

  private parseHHmm(hhmm?: string): { h: number; m: number } {
    if (!hhmm) throw new BadRequestException('Horário inválido');
    const t = /^(\d{2}):(\d{2})$/.exec(hhmm);
    if (!t) throw new BadRequestException('Use HH:mm');
    const [, hh, mm] = t.map(Number) as unknown as number[];
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59)
      throw new BadRequestException('Horário fora do intervalo');
    return { h: hh, m: mm };
  }

  private getIntervals({
    days,
    all_day,
    start_time,
    end_time,
  }: {
    days: Date[];
    all_day: boolean;
    start_time?: string;
    end_time?: string;
  }): Interval[] {
    return days.map((d) => {
      if (all_day) {
        const sLocal = startOfDay(d) as TZDate;
        const endLocalNext = addDays(startOfDay(d) as TZDate, 1) as TZDate;
        return {
          startUtc: new Date(sLocal),
          endUtc: new Date(endLocalNext),
          startLocal: sLocal,
          endLocal: endLocalNext,
          startLocalISO: format(sLocal, "yyyy-MM-dd'T'HH:mm"),
          endLocalISO: format(endLocalNext, "yyyy-MM-dd'T'HH:mm"),
          isAllDay: true,
        };
      } else {
        const { h: sh, m: sm } = this.parseHHmm(start_time);
        const { h: eh, m: em } = this.parseHHmm(end_time);
        const sLocal = new TZDate(
          (d as Date).getFullYear(),
          (d as Date).getMonth(),
          (d as Date).getDate(),
          sh,
          sm,
          0,
          BUSINESS_TZ_ID,
        );
        const eLocal = new TZDate(
          (d as Date).getFullYear(),
          (d as Date).getMonth(),
          (d as Date).getDate(),
          eh,
          em,
          0,
          BUSINESS_TZ_ID,
        );
        if (eLocal <= sLocal)
          throw new BadRequestException('end_time deve ser após start_time');
        return {
          startUtc: new Date(sLocal),
          endUtc: new Date(eLocal),
          startLocal: sLocal,
          endLocal: eLocal,
          startLocalISO: format(sLocal, "yyyy-MM-dd'T'HH:mm"),
          endLocalISO: format(eLocal, "yyyy-MM-dd'T'HH:mm"),
          isAllDay: false,
        };
      }
    });
  }
}
