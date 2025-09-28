import { PrismaService } from '@app/shared';
import { TZDate, tz } from '@date-fns/tz';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  addMinutes,
  areIntervalsOverlapping,
  endOfDay,
  format,
  isBefore,
  isEqual,
  startOfDay,
} from 'date-fns';
import { GetAvailableTimesForServiceAndProfessionalDto } from '../dto/requests/get-available-times-for-service-and-professional.dto';

type OpeningHours = {
  day: string; // 'MONDAY', 'TUESDAY', ...
  closed: boolean;
  times?: { startTime: string; endTime: string }[]; // 'HH:mm'
}[];

const BUSINESS_TZ_ID = 'America/Sao_Paulo';
const Z = tz(BUSINESS_TZ_ID);

@Injectable()
export class GetAvailableTimesForServiceAndProfessionalUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    service_id,
    professional_id,
    day,
    business_slug,
  }: GetAvailableTimesForServiceAndProfessionalDto) {
    // --- valida 'day' (yyyy-MM-dd) e cria um TZDate no fuso do negócio ---
    // Não usamos parse() aqui pra evitar ambiguidade de fuso; fazemos split manual.
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
    if (!m) {
      throw new BadRequestException(
        'Parâmetro "day" inválido. Use yyyy-MM-dd.',
      );
    }
    const [_, y, mo, d] = m;
    const year = Number(y);
    const monthIndex = Number(mo) - 1; // 0-11
    const dayNum = Number(d);

    const selectedDateLocal = new TZDate(
      year,
      monthIndex,
      dayNum,
      BUSINESS_TZ_ID,
    );

    // --- carrega dados em paralelo ---
    const [service, business] = await Promise.all([
      this.prisma.service.findUnique({
        where: { id: service_id },
        select: { duration: true },
      }),
      this.prisma.business.findUnique({
        where: { slug: business_slug },
        select: { opening_hours: true, id: true },
      }),
    ]);
    if (!service) throw new NotFoundException('Serviço não encontrado');
    if (!business) throw new NotFoundException('Negócio não encontrado');

    // --- normaliza opening_hours ---
    let openingHours: OpeningHours = [];
    const raw = business.opening_hours as any;
    openingHours =
      typeof raw === 'string' ? JSON.parse(raw) : (raw as OpeningHours);

    // dia da semana no fuso do negócio
    const weekdayKey = format(selectedDateLocal, 'EEEE', {
      in: Z,
    }).toUpperCase(); // 'MONDAY', ...
    const dayConfig = openingHours.find((d) => d.day === weekdayKey);

    if (!dayConfig || dayConfig.closed || !dayConfig.times?.length) {
      return {
        date: format(selectedDateLocal, 'yyyy-MM-dd', { in: Z }),
        availableSlots: [] as string[],
      };
    }

    // --- gera candidatos no horário LOCAL ---
    const dateStr = format(selectedDateLocal, 'yyyy-MM-dd', { in: Z });
    const candidates: TZDate[] = [];

    const now = new Date();
    const nowLocal = new TZDate(now, BUSINESS_TZ_ID);
    const isTodayInTZ =
      format(selectedDateLocal, 'yyyy-MM-dd', { in: Z }) ===
      format(nowLocal, 'yyyy-MM-dd', { in: Z });

    for (const t of dayConfig.times) {
      const [sh, sm] = t.startTime.split(':').map(Number);
      const [eh, em] = t.endTime.split(':').map(Number);

      let startLocal = new TZDate(
        year,
        monthIndex,
        dayNum,
        sh,
        sm ?? 0,
        BUSINESS_TZ_ID,
      );
      const endLocal = new TZDate(
        year,
        monthIndex,
        dayNum,
        eh,
        em ?? 0,
        BUSINESS_TZ_ID,
      );

      while (
        isBefore(
          addMinutes(startLocal, service.duration, { in: Z }),
          endLocal,
        ) ||
        isEqual(addMinutes(startLocal, service.duration, { in: Z }), endLocal)
      ) {
        if (!isTodayInTZ || isBefore(nowLocal, startLocal)) {
          candidates.push(startLocal);
        }
        startLocal = addMinutes(startLocal, service.duration, {
          in: Z,
        }) as TZDate;
      }
    }

    if (candidates.length === 0) {
      return {
        date: format(selectedDateLocal, 'yyyy-MM-dd', { in: Z }),
        availableSlots: [] as string[],
      };
    }

    // --- janela local do dia → UTC (pra query no banco) ---
    const dayStartLocal = startOfDay(selectedDateLocal, { in: Z }) as TZDate;
    const dayEndLocal = endOfDay(selectedDateLocal, { in: Z }) as TZDate;

    // toDate() retorna um Date no instante UTC correspondente àquele horário local
    const dayStartUtc: Date = dayStartLocal;
    const dayEndUtc: Date = dayEndLocal;

    // --- busca appointments que INTERSECTAM o dia local (comparando em UTC no banco) ---
    // intersecção: start_at_utc < dayEndUtc AND end_at_utc > dayStartUtc
    const appointments = await this.prisma.appointment.findMany({
      where: {
        professionalProfileId: professional_id,
        start_at_utc: { lt: dayEndUtc },
        end_at_utc: { gt: dayStartUtc },
      },
      select: {
        start_at_utc: true,
        end_at_utc: true,
        duration_minutes: true, // se existir no schema
        service: { select: { duration: true } },
      },
      orderBy: { start_at_utc: 'asc' },
    });

    // --- ranges ocupados em HORÁRIO LOCAL (TZDate) ---
    const busyRanges = appointments.map((appt) => {
      const startLocal = new TZDate(appt.start_at_utc, BUSINESS_TZ_ID);
      const endLocal = new TZDate(appt.end_at_utc, BUSINESS_TZ_ID);

      // Se preferir confiar na duração persistida:
      // const dur = appt.duration_minutes ?? appt.service.duration;
      // const endLocal = addMinutes(startLocal, dur, { in: Z }) as TZDate;

      return { start: startLocal, end: endLocal };
    });

    // --- filtra candidatos removendo conflitos (comparação local) ---
    const availableSlots = candidates
      .filter((startLocal) => {
        const endLocal = addMinutes(startLocal, service.duration, {
          in: Z,
        }) as TZDate;

        return !busyRanges.some((b) =>
          areIntervalsOverlapping({ start: startLocal, end: endLocal }, b, {
            inclusive: false,
            in: Z,
          }),
        );
      })
      .map((slot) => format(slot, 'HH:mm', { in: Z }));

    return {
      date: format(selectedDateLocal, 'yyyy-MM-dd', { in: Z }),
      availableSlots,
    };
  }
}
