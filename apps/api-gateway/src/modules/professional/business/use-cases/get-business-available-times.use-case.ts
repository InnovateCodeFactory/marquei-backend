import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, Logger } from '@nestjs/common';
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
import { GetBusinessAvailableTimesDto } from '../dto/requests/get-business-available-times.dto';

@Injectable()
export class GetBusinessAvailableTimesUseCase {
  private readonly logger = new Logger(GetBusinessAvailableTimesUseCase.name);

  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: GetBusinessAvailableTimesDto, user: CurrentUser) {
    const { service_id, start_date } = payload;
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
      // Parse manual se for string
      openingHours = JSON.parse(business.opening_hours);
    } else {
      // Já é objeto JSON
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
      for (const time of dayConfig.times) {
        let startTime = new Date(`${dateStr}T${time.startTime}`);
        const endTime = new Date(`${dateStr}T${time.endTime}`);

        while (
          isBefore(addMinutes(startTime, service.duration), endTime) ||
          isEqual(addMinutes(startTime, service.duration), endTime)
        ) {
          slots.push(format(startTime, 'HH:mm'));
          startTime = addMinutes(startTime, service.duration);
        }
      }

      const appointments = await this.prismaService.appointment.findMany({
        where: {
          service: { businessId: business.id },
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
        const start = new Date(appt.scheduled_at);
        const end = addMinutes(start, appt.service.duration);
        return { start, end };
      });

      const availableSlots = slots.filter((slot) => {
        const start = new Date(`${dateStr}T${slot}`);
        const end = addMinutes(start, service.duration);
        return !busyRanges.some((busy) =>
          areIntervalsOverlapping({ start, end }, busy, { inclusive: true }),
        );
      });

      days.push({ date: dateStr, availableSlots });
    }

    return { days };
  }
}
