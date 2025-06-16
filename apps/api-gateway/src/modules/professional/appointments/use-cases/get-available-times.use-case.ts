import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import {
  addDays,
  addMinutes,
  areIntervalsOverlapping,
  endOfDay,
  format,
  isBefore,
  isEqual,
  parseISO,
  startOfDay,
} from 'date-fns';
import { GetAvailableTimesDto } from '../dto/requests/get-available-times.dto';

@Injectable()
export class GetAvailableTimesUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: GetAvailableTimesDto, user: CurrentUser) {
    const { service_id, start_date, professional_id } = payload;
    const { current_selected_business_slug } = user;

    const service = await this.prismaService.service.findUnique({
      where: { id: service_id },
      select: { duration: true },
    });
    if (!service) throw new Error('Serviço não encontrado');

    const business = await this.prismaService.business.findUnique({
      where: { slug: current_selected_business_slug },
      select: { opening_hours: true, id: true },
    });
    if (!business) throw new Error('Negócio não encontrado');

    let openingHours: {
      day: string;
      closed: boolean;
      times?: { startTime: string; endTime: string }[];
    }[] = [];

    if (typeof business.opening_hours === 'string') {
      openingHours = JSON.parse(business.opening_hours);
    } else {
      openingHours = business.opening_hours as typeof openingHours;
    }

    const days = [];

    for (let i = 0; i < 3; i++) {
      const currentDate = addDays(parseISO(start_date), i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const weekday = format(currentDate, 'EEEE').toUpperCase();

      const dayConfig = openingHours.find((day) => day.day === weekday);

      if (!dayConfig || dayConfig.closed || !dayConfig.times?.length) {
        days.push({ date: dateStr, availableSlots: [] });
        continue;
      }

      const slots: string[] = [];
      const now = new Date();
      const isToday =
        format(currentDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');

      for (const time of dayConfig.times) {
        let startTime = new Date(`${dateStr}T${time.startTime}`);
        const endTime = new Date(`${dateStr}T${time.endTime}`);

        while (
          isBefore(addMinutes(startTime, service.duration), endTime) ||
          isEqual(addMinutes(startTime, service.duration), endTime)
        ) {
          if (!isToday || isBefore(now, startTime)) {
            slots.push(format(startTime, 'HH:mm'));
          }
          startTime = addMinutes(startTime, service.duration);
        }
      }

      const appointments = await this.prismaService.appointment.findMany({
        where: {
          professionalProfileId: professional_id,
          scheduled_at: {
            gte: startOfDay(currentDate),
            lte: endOfDay(currentDate),
          },
        },
        select: {
          scheduled_at: true,
          service: { select: { duration: true } },
        },
      });

      const busyRanges = appointments.map((appt) => {
        const rawDate = appt.scheduled_at;

        // Força a criação local manual — NÃO UTC
        const [year, month, day, hour, minute, second] = rawDate
          .toISOString()
          .split(/[-T:.Z]/)
          .map(Number);

        const localDate = new Date(year, month - 1, day, hour, minute, second); // local time

        const start = localDate;
        const end = addMinutes(start, appt.service.duration);
        return { start, end };
      });

      const availableSlots = slots.filter((slot) => {
        const start = new Date(`${dateStr}T${slot}`); // ← sem Z
        const end = addMinutes(start, service.duration);

        return !busyRanges.some((busy) =>
          areIntervalsOverlapping({ start, end }, busy, { inclusive: false }),
        );
      });

      days.push({ date: dateStr, availableSlots });
    }

    return { days };
  }
}
