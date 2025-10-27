import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatDate } from '@app/shared/utils';
import { tz } from '@date-fns/tz';
import { Injectable, UnauthorizedException } from '@nestjs/common';

const DEFAULT_TZ = 'America/Sao_Paulo';

@Injectable()
export class ListBlockedTimesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(user: CurrentUser) {
    if (!user?.current_selected_business_id) {
      throw new UnauthorizedException('User not authorized');
    }
    const items = await this.prisma.professionalTimesBlock.findMany({
      where: { businessId: user.current_selected_business_id },
      orderBy: { start_at_utc: 'asc' },
      select: {
        id: true,
        professionalProfileId: true,
        businessId: true,
        is_all_day: true,
        start_at_utc: true,
        end_at_utc: true,
        timezone: true,
        start_offset_minutes: true,
        created_at: true,
      },
    });

    // Agrupa ranges de "dia inteiro" contíguos (end == next.start)
    const grouped: typeof items = [] as any;
    let i = 0;
    while (i < items.length) {
      const cur = items[i];
      if (!cur.is_all_day) {
        grouped.push(cur);
        i += 1;
        continue;
      }
      // inicia grupo all-day
      let start = cur.start_at_utc;
      let end = cur.end_at_utc;
      let j = i + 1;
      while (
        j < items.length &&
        items[j].is_all_day &&
        items[j].start_at_utc.getTime() === end.getTime()
      ) {
        // estende até o fim do próximo
        end = items[j].end_at_utc;
        j += 1;
      }
      // adiciona um registro representando o range completo de dias inteiros
      grouped.push({
        ...cur,
        start_at_utc: start,
        end_at_utc: end,
        id: cur.id,
      });
      i = j;
    }

    const result = grouped.map((b) => {
      const zone = b.timezone || DEFAULT_TZ;
      const IN_TZ = tz(zone);
      if (b.is_all_day) {
        // end_at_utc aponta para 00:00 do dia seguinte local; para exibir a data final correta,
        // subtraímos 1 minuto ao renderizar
        const endMinus = new Date(b.end_at_utc.getTime() - 60 * 1000);
        const startStr = formatDate(b.start_at_utc, 'd MMM');
        const endStr = formatDate(endMinus, 'd MMM');
        const label = `${startStr} até ${endStr} - dia inteiro`;
        return {
          id: b.id,
          is_all_day: true,
          start_at_utc: b.start_at_utc,
          end_at_utc: b.end_at_utc,
          timezone: b.timezone,
          label,
        };
      } else {
        const dateStr = formatDate(b.start_at_utc, 'd MMM');
        const startTime = formatDate(b.start_at_utc, "HH'h'");
        const endTime = formatDate(b.end_at_utc, "HH'h'");
        const label = `${dateStr} - ${startTime} até ${endTime}`;
        return {
          id: b.id,
          label,
        };
      }
    });

    return { items: result };
  }
}
