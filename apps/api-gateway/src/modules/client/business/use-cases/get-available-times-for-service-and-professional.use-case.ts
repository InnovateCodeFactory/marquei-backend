import { PrismaService } from '@app/shared';
import { AppointmentStatusEnum } from '@app/shared/enum';
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
    combo_id,
    professional_id,
    day,
    business_slug,
  }: GetAvailableTimesForServiceAndProfessionalDto) {
    const hasServiceId = Boolean(service_id?.trim());
    const hasComboId = Boolean(combo_id?.trim());

    if (!hasServiceId && !hasComboId) {
      throw new BadRequestException(
        'Parâmetros inválidos: informe service_id ou combo_id.',
      );
    }

    if (hasServiceId && hasComboId) {
      throw new BadRequestException(
        'Parâmetros inválidos: informe apenas um entre service_id ou combo_id.',
      );
    }

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
    const [business, professional, service, combo, professionalHasService, professionalHasCombo] =
      await Promise.all([
        this.prisma.business.findUnique({
          where: { slug: business_slug },
          select: { opening_hours: true, id: true },
        }),
        this.prisma.professionalProfile.findFirst({
          where: {
            id: professional_id,
            business: { slug: business_slug },
            status: 'ACTIVE',
          },
          select: { id: true },
        }),
        hasServiceId
          ? this.prisma.service.findFirst({
              where: {
                id: service_id!,
                business: { slug: business_slug },
                is_active: true,
              },
              select: { id: true, duration: true },
            })
          : Promise.resolve(null),
        hasComboId
          ? this.prisma.serviceCombo.findFirst({
              where: {
                id: combo_id!,
                business: { slug: business_slug },
                is_active: true,
                deleted_at: null,
              },
              select: {
                id: true,
                final_duration_minutes: true,
                items: {
                  where: {
                    service: {
                      is_active: true,
                    },
                  },
                  select: { id: true },
                },
              },
            })
          : Promise.resolve(null),
        hasServiceId
          ? this.prisma.professionalService.count({
              where: {
                professional_profile_id: professional_id,
                service_id: service_id!,
                active: true,
              },
            })
          : Promise.resolve(0),
        hasComboId
          ? this.prisma.professionalServiceCombo.count({
              where: {
                professional_profile_id: professional_id,
                service_combo_id: combo_id!,
                active: true,
              },
            })
          : Promise.resolve(0),
      ]);

    if (!business) throw new NotFoundException('Negócio não encontrado');
    if (!professional) {
      throw new NotFoundException('Profissional não encontrado para este negócio');
    }

    if (hasServiceId && !service) {
      throw new NotFoundException('Serviço não encontrado');
    }

    if (hasComboId && !combo) {
      throw new NotFoundException('Combo não encontrado');
    }

    if (hasComboId && (combo?.items?.length ?? 0) < 2) {
      throw new BadRequestException('Combo indisponível para agendamento');
    }

    if (hasServiceId && professionalHasService < 1) {
      throw new BadRequestException(
        'Este profissional não executa o serviço selecionado',
      );
    }

    if (hasComboId && professionalHasCombo < 1) {
      throw new BadRequestException(
        'Este profissional não executa o combo selecionado',
      );
    }

    const appointmentDuration =
      service?.duration ?? combo?.final_duration_minutes ?? 0;
    if (appointmentDuration <= 0) {
      throw new BadRequestException('Duração inválida para cálculo de horários');
    }

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
          addMinutes(startLocal, appointmentDuration, { in: Z }),
          endLocal,
        ) ||
        isEqual(addMinutes(startLocal, appointmentDuration, { in: Z }), endLocal)
      ) {
        if (!isTodayInTZ || isBefore(nowLocal, startLocal)) {
          candidates.push(startLocal);
        }
        startLocal = addMinutes(startLocal, appointmentDuration, {
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
        status: {
          in: [AppointmentStatusEnum.PENDING, AppointmentStatusEnum.CONFIRMED],
        },
      },
      select: {
        start_at_utc: true,
        end_at_utc: true,
        duration_minutes: true, // se existir no schema
        service: { select: { duration: true } },
      },
      orderBy: { start_at_utc: 'asc' },
    });

    // --- também busca bloqueios que INTERSECTAM o dia ---
    const blocks = await this.prisma.professionalTimesBlock.findMany({
      where: {
        professionalProfileId: professional_id,
        start_at_utc: { lt: dayEndUtc },
        end_at_utc: { gt: dayStartUtc },
      },
      select: { start_at_utc: true, end_at_utc: true, timezone: true },
      orderBy: { start_at_utc: 'asc' },
    });

    // --- ranges ocupados em HORÁRIO LOCAL (TZDate) ---
    const busyRanges = [
      // Appointments
      ...appointments.map((appt) => {
        const startLocal = new TZDate(appt.start_at_utc, BUSINESS_TZ_ID);
        const endLocal = new TZDate(
          appt.end_at_utc ??
            (addMinutes(
              new TZDate(appt.start_at_utc, BUSINESS_TZ_ID),
              appt.duration_minutes ?? appt.service.duration,
              { in: Z },
            ) as TZDate),
          BUSINESS_TZ_ID,
        );
        return { start: startLocal, end: endLocal };
      }),
      // Blocks
      ...blocks.map((b) => {
        const zone = b.timezone || BUSINESS_TZ_ID;
        return {
          start: new TZDate(b.start_at_utc, zone),
          end: new TZDate(b.end_at_utc, zone),
        };
      }),
    ];

    // --- filtra candidatos removendo conflitos (comparação local) ---
    const availableSlots = candidates
      .filter((startLocal) => {
        const endLocal = addMinutes(startLocal, appointmentDuration, {
          in: Z,
        }) as TZDate;

        return !busyRanges.some((b) =>
          areIntervalsOverlapping(
            { start: startLocal as Date, end: endLocal as Date },
            { start: b.start as Date, end: b.end as Date },
            { inclusive: false },
          ),
        );
      })
      .map((slot) => format(slot, 'HH:mm', { in: Z }));

    return {
      date: format(selectedDateLocal, 'yyyy-MM-dd', { in: Z }),
      availableSlots,
    };
  }
}
