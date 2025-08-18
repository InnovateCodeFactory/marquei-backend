import { PrismaService } from '@app/shared';
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
  parse,
  startOfDay,
} from 'date-fns';
import { GetAvailableTimesForServiceAndProfessionalDto } from '../dto/requests/get-available-times-for-service-and-professional.dto';

type OpeningHours = {
  day: string; // ex: 'MONDAY', 'TUESDAY'...
  closed: boolean;
  times?: { startTime: string; endTime: string }[]; // 'HH:mm'
}[];

@Injectable()
export class GetAvailableTimesForServiceAndProfessionalUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    service_id,
    professional_id,
    day,
    business_slug,
  }: GetAvailableTimesForServiceAndProfessionalDto) {
    // --- validação simples do formato do dia ---
    // Espera 'yyyy-MM-dd' (ex.: '2025-08-17')
    const selectedDate = parse(day, 'yyyy-MM-dd', new Date());
    if (isNaN(selectedDate.getTime())) {
      throw new BadRequestException(
        'Parâmetro "day" inválido. Use yyyy-MM-dd.',
      );
    }

    // --- carrega dados necessários em paralelo (menos latência) ---
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

    // descobre config do dia
    const weekdayKey = format(selectedDate, 'EEEE').toUpperCase(); // 'MONDAY', ...
    const dayConfig = openingHours.find((d) => d.day === weekdayKey);

    if (!dayConfig || dayConfig.closed || !dayConfig.times?.length) {
      return {
        date: format(selectedDate, 'yyyy-MM-dd'),
        availableSlots: [] as string[],
      };
    }

    // --- gera todos os "candidate slots" baseado no opening_hours + duração do serviço ---
    const dateStr = format(selectedDate, 'yyyy-MM-dd'); // para montar 'yyyy-MM-ddTHH:mm'
    const candidates: string[] = [];
    const now = new Date();
    const isToday =
      format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');

    for (const t of dayConfig.times) {
      let start = new Date(`${dateStr}T${t.startTime}`); // local time
      const end = new Date(`${dateStr}T${t.endTime}`); // local time

      while (
        isBefore(addMinutes(start, service.duration), end) ||
        isEqual(addMinutes(start, service.duration), end)
      ) {
        // se for hoje, só horários futuros
        if (!isToday || isBefore(now, start)) {
          candidates.push(format(start, 'HH:mm'));
        }
        start = addMinutes(start, service.duration);
      }
    }

    if (candidates.length === 0) {
      return {
        date: format(selectedDate, 'yyyy-MM-dd'),
        availableSlots: [] as string[],
      };
    }

    // --- busca compromissos do profissional nesse dia (uma ida ao banco) ---
    const [appointments] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          professionalProfileId: professional_id,
          scheduled_at: {
            gte: startOfDay(selectedDate),
            lte: endOfDay(selectedDate),
          },
        },
        select: {
          scheduled_at: true,
          service: { select: { duration: true } },
        },
      }),
    ]);

    // --- normaliza intervalos ocupados (força Data local para comparar com os "candidates") ---
    // Observação: se 'scheduled_at' vier em UTC no banco, criar Date "local" a partir dos componentes ISO
    // evita desvio por timezone quando comparamos com new Date(`${dateStr}T${HH:mm}`) (local).
    const busyRanges = appointments.map((appt) => {
      const raw = appt.scheduled_at; // Date
      const [Y, M, D, hh, mm, ss] = raw
        .toISOString()
        .split(/[-T:.Z]/)
        .map(Number);
      const localStart = new Date(Y, M - 1, D, hh, mm, ss || 0); // local time
      const localEnd = addMinutes(localStart, appt.service.duration);
      return { start: localStart, end: localEnd };
    });

    // --- filtra candidatos removendo conflitos ---
    const availableSlots = candidates.filter((slot) => {
      const start = new Date(`${dateStr}T${slot}`); // local
      const end = addMinutes(start, service.duration);

      // se houver qualquer overlap com algum agendamento, descarta
      return !busyRanges.some((b) =>
        areIntervalsOverlapping({ start, end }, b, { inclusive: false }),
      );
    });

    return {
      date: format(selectedDate, 'yyyy-MM-dd'),
      availableSlots,
    };
  }
}
