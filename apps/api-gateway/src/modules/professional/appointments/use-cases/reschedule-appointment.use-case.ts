import { PrismaService } from '@app/shared';
import { SendRescheduleAppointmentMailDto } from '@app/shared/dto/messaging/mail-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import {
  formatDurationToHoursAndMinutes,
  getClientIp,
  getTwoNames,
} from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { TZDate, tz } from '@date-fns/tz';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { addMinutes, format } from 'date-fns';
import { RescheduleAppointmentDto } from '../dto/requests/reschedule-appointment.dto';

const BUSINESS_TZ_ID = 'America/Sao_Paulo';
const IN_TZ = tz(BUSINESS_TZ_ID);

@Injectable()
export class RescheduleAppointmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(body: RescheduleAppointmentDto, req: AppRequest) {
    const { appointment_id, new_appointment_date } = body;
    const { user, headers } = req;

    // Carrega appointment com contexto necessário
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointment_id },
      select: {
        id: true,
        status: true,
        notes: true,
        start_at_utc: true,
        end_at_utc: true,
        timezone: true,
        duration_minutes: true,
        professionalProfileId: true,
        professional: {
          select: {
            userId: true,
            User: { select: { name: true } },
            business_id: true,
          },
        },
        service: {
          select: {
            name: true,
            duration: true, // fallback
            price_in_cents: true,
          },
        },
        customerPerson: {
          select: { name: true, email: true },
        },
      },
    });

    if (!appointment) {
      throw new BadRequestException('Agendamento não encontrado');
    }

    if (
      appointment.professional?.business_id !==
      user.current_selected_business_id
    ) {
      throw new ForbiddenException(
        'O profissional não pode remarcar este agendamento',
      );
    }

    if (
      appointment.status !== 'PENDING' &&
      appointment.status !== 'CONFIRMED'
    ) {
      throw new BadRequestException(
        'Apenas agendamentos pendentes ou confirmados podem ser remarcados',
      );
    }

    // Interpretar a nova data como horário LOCAL do negócio
    const startLocal = this.toTZDateLocal(new_appointment_date);
    const durationMin =
      appointment.duration_minutes ?? appointment.service.duration;
    if (!durationMin || durationMin <= 0) {
      throw new BadRequestException(
        'Duração do serviço inválida para remarcar.',
      );
    }
    const endLocal = addMinutes(startLocal, durationMin) as TZDate;

    // Para persistir/consultar, tratar TZDate como Date (instante UTC)
    const newStartUtc: Date = new Date(startLocal);
    const newEndUtc: Date = new Date(endLocal);

    // Checagem de overlap no mesmo profissional (excluindo o próprio agendamento)
    const overlapping = await this.prisma.appointment.findFirst({
      where: {
        id: { not: appointment.id },
        professionalProfileId: appointment.professionalProfileId,
        start_at_utc: { lt: newEndUtc },
        end_at_utc: { gt: newStartUtc },
      },
      select: { id: true },
    });

    if (overlapping) {
      throw new BadRequestException(
        'Já existe um agendamento que conflita com esse novo horário para este profissional.',
      );
    }

    // Transação: update + evento
    await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          start_at_utc: newStartUtc,
          end_at_utc: newEndUtc,
          timezone: appointment.timezone || BUSINESS_TZ_ID,
          status: 'PENDING', // volta para pendente após remarcação
          events: {
            create: {
              by_professional: true,
              event_type: 'RESCHEDULED',
              by_user_id: user.id,
              reason: undefined,
              ip: getClientIp(req),
              user_agent: headers['user-agent'],
            },
          },
        },
      }),
    ]);

    // E-mail (se tiver)
    if (appointment.customerPerson?.email) {
      await this.rmqService.publishToQueue({
        payload: new SendRescheduleAppointmentMailDto({
          serviceName: appointment.service.name,
          apptDate: format(newStartUtc, 'dd/MM/yyyy', { in: IN_TZ }),
          apptTime: format(newStartUtc, 'HH:mm', { in: IN_TZ }),
          toName: getTwoNames(appointment.customerPerson.name),
          duration: formatDurationToHoursAndMinutes(durationMin),
          price: new Price(appointment.service.price_in_cents).toCurrency(),
          byName: getTwoNames(appointment.professional.User.name),
          to: appointment.customerPerson.email,
          clientNotes: appointment.notes || '-',
          byTypeLabel: 'profissional',
        }),
        routingKey:
          MESSAGING_QUEUES.MAIL_NOTIFICATIONS
            .SEND_RESCHEDULE_APPOINTMENT_MAIL_QUEUE,
      });
    }

    return;
  }

  /**
   * Converte Date|string para TZDate no fuso do negócio (America/Sao_Paulo),
   * interpretando a string como horário LOCAL (sem 'Z').
   */
  private toTZDateLocal(input: Date | string): TZDate {
    if (input instanceof Date) return new TZDate(input, BUSINESS_TZ_ID);

    const iso = input.replace(' ', 'T');
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ]?(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      iso,
    );
    if (!m) {
      const d = new Date(input);
      if (isNaN(d.getTime())) {
        throw new BadRequestException(
          'Formato de data/hora inválido para new_appointment_date.',
        );
      }
      return new TZDate(d, BUSINESS_TZ_ID);
    }
    const [, y, mo, d, hh, mm, ss] = m.map(Number) as unknown as number[];
    return new TZDate(y, mo - 1, d, hh, mm, ss || 0, BUSINESS_TZ_ID);
  }
}
