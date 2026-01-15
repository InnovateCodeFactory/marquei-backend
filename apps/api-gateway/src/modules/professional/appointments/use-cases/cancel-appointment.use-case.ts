import { PrismaService } from '@app/shared';
import { SendCancelAppointmentMailDto } from '@app/shared/dto/messaging/mail-notifications/send-cancel-appointment.dto';
import { GoogleCalendarService } from '@app/shared/modules/google-calendar/google-calendar.service';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import {
  formatDurationToHoursAndMinutes,
  getClientIp,
  getTwoNames,
} from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { tz } from '@date-fns/tz';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { format } from 'date-fns';
import { CancelAppointmentDto } from '../dto/requests/cancel-appointment.dto';

@Injectable()
export class CancelAppointmentUseCase {
  private readonly logger = new Logger(CancelAppointmentUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rmqService: RmqService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async execute(body: CancelAppointmentDto, req: AppRequest) {
    const { appointment_id, reason } = body;
    const { user, headers } = req;

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointment_id },
      select: {
        id: true,
        status: true,
        // UTC + contexto do agendamento
        start_at_utc: true,
        timezone: true,
        duration_minutes: true,
        google_calendar_event_id: true,

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
            duration: true, // fallback se não houver duration_minutes
            price_in_cents: true,
          },
        },
        customerPerson: {
          select: {
            name: true,
            email: true,
          },
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
        'O profissional não pode cancelar este agendamento',
      );
    }

    if (appointment.status === 'CANCELED') {
      throw new BadRequestException('Agendamento já está cancelado');
    }

    // Transação: grava evento e atualiza status
    await this.prisma.$transaction([
      this.prisma.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          by_professional: true,
          event_type: 'CANCELED',
          by_user_id: user.id,
          reason,
          ip: getClientIp(req),
          user_agent: headers['user-agent'],
        },
      }),
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CANCELED' },
      }),
      this.prisma.reminderJob.updateMany({
        where: {
          appointmentId: appointment.id,
          status: { in: ['PENDING', 'SCHEDULED'] },
        },
        data: {
          status: 'CANCELED',
          error: 'appointment_canceled',
        },
      }),
    ]);

    if (appointment.google_calendar_event_id && appointment.professional?.userId) {
      try {
        const integration = await this.prisma.userIntegration.findUnique({
          where: { id: `${appointment.professional.userId}_GOOGLE_CALENDAR` },
          select: {
            access_token: true,
            refresh_token: true,
            scope: true,
            token_type: true,
            expiry_date: true,
            raw_tokens: true,
          },
        });

        if (integration) {
          const tokens = {
            ...(integration.raw_tokens as any),
            access_token: integration.access_token ?? undefined,
            refresh_token: integration.refresh_token ?? undefined,
            scope: integration.scope ?? undefined,
            token_type: integration.token_type ?? undefined,
            expiry_date: integration.expiry_date
              ? integration.expiry_date.getTime()
              : undefined,
          };

          await this.googleCalendarService.deleteEvent({
            tokens,
            eventId: appointment.google_calendar_event_id,
          });

          await this.prisma.appointment.update({
            where: { id: appointment.id },
            data: { google_calendar_event_id: null },
          });
        }
      } catch (error) {
        this.logger.error(
          'Erro ao remover evento no Google Calendar (profissional):',
          (error as any)?.response?.data || error,
        );
      }
    }

    // Notificação por email (se houver)
    if (appointment.customerPerson?.email) {
      const zoneId = appointment.timezone || 'America/Sao_Paulo';
      const IN_TZ = tz(zoneId);

      const durationMin =
        appointment.duration_minutes ?? appointment.service.duration;

      await this.rmqService.publishToQueue({
        payload: new SendCancelAppointmentMailDto({
          serviceName: appointment.service.name,
          apptDate: format(appointment.start_at_utc, 'dd/MM/yyyy', {
            in: IN_TZ,
          }),
          apptTime: format(appointment.start_at_utc, 'HH:mm', { in: IN_TZ }),
          toName: getTwoNames(appointment.customerPerson.name),
          duration: formatDurationToHoursAndMinutes(durationMin),
          price: new Price(appointment.service.price_in_cents).toCurrency(),
          byName: getTwoNames(appointment.professional.User.name),
          byTypeLabel: 'profissional',
          to: appointment.customerPerson.email,
        }),
        routingKey:
          MESSAGING_QUEUES.MAIL_NOTIFICATIONS
            .SEND_CANCEL_APPOINTMENT_MAIL_QUEUE,
      });
    }

    return;
  }
}
