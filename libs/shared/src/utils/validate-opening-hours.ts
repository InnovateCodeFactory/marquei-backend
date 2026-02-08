import { BadRequestException } from '@nestjs/common';

const WEEK_DAYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

const DAY_LABEL_PT: Record<string, string> = {
  SUNDAY: 'domingo',
  MONDAY: 'segunda-feira',
  TUESDAY: 'terca-feira',
  WEDNESDAY: 'quarta-feira',
  THURSDAY: 'quinta-feira',
  FRIDAY: 'sexta-feira',
  SATURDAY: 'sabado',
};

type TimeRangeLike = {
  startTime?: string;
  endTime?: string;
  start?: string;
  end?: string;
};

type OpeningDayLike = {
  day?: string;
  times?: TimeRangeLike[];
  closed?: boolean;
};

function toMinutes(value: string): number {
  const match = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/.exec(value);
  if (!match) {
    throw new BadRequestException(
      'Horario invalido. Use o formato HH:mm para abertura e fechamento.',
    );
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour * 60 + minute;
}

function normalizeDayKey(day?: string, index?: number): string {
  const raw = (day || '').trim().toUpperCase();
  if (WEEK_DAYS.includes(raw as any)) return raw;
  if (typeof index === 'number' && WEEK_DAYS[index]) return WEEK_DAYS[index];
  return raw || 'DIA';
}

function getDayLabel(dayKey: string): string {
  return DAY_LABEL_PT[dayKey] || dayKey.toLowerCase();
}

function normalizeOpeningHoursInput(
  openingHours: unknown,
): Array<{ dayKey: string; closed: boolean; times: TimeRangeLike[] }> {
  let source: any = openingHours;

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      throw new BadRequestException('Formato de horario de funcionamento invalido.');
    }
  }

  if (Array.isArray(source)) {
    return source.map((item: OpeningDayLike, index) => ({
      dayKey: normalizeDayKey(item?.day, index),
      closed: item?.closed === true,
      times: Array.isArray(item?.times) ? item.times : [],
    }));
  }

  if (source && typeof source === 'object') {
    return Object.entries(source).map(([dayKey, times]) => ({
      dayKey: normalizeDayKey(dayKey),
      closed: false,
      times: Array.isArray(times) ? (times as TimeRangeLike[]) : [],
    }));
  }

  throw new BadRequestException('Formato de horario de funcionamento invalido.');
}

export function validateBusinessOpeningHours(
  openingHours: unknown,
  options?: { requireSevenDays?: boolean },
) {
  const normalizedDays = normalizeOpeningHoursInput(openingHours);

  if (options?.requireSevenDays && normalizedDays.length !== 7) {
    throw new BadRequestException(
      'Horario de funcionamento deve conter os 7 dias da semana.',
    );
  }

  for (const day of normalizedDays) {
    if (day.closed && day.times.length > 0) {
      throw new BadRequestException(
        `O dia ${getDayLabel(day.dayKey)} esta marcado como fechado e nao pode ter horarios.`,
      );
    }

    const intervals = day.times.map((time) => {
      const start = (time?.startTime || time?.start || '').trim();
      const end = (time?.endTime || time?.end || '').trim();

      if (!start || !end) {
        throw new BadRequestException(
          `Horario incompleto em ${getDayLabel(day.dayKey)}.`,
        );
      }

      const startMin = toMinutes(start);
      const endMin = toMinutes(end);
      if (startMin >= endMin) {
        throw new BadRequestException(
          `Horario invalido em ${getDayLabel(day.dayKey)}: abertura deve ser antes do fechamento.`,
        );
      }

      return { startMin, endMin };
    });

    const sorted = intervals.sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].startMin < sorted[i - 1].endMin) {
        throw new BadRequestException(
          `Existem horarios sobrepostos em ${getDayLabel(day.dayKey)}.`,
        );
      }
    }
  }
}
