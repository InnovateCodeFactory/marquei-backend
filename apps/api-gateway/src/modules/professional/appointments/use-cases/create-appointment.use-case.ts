import { PrismaService } from '@app/shared';
import { SendPushNotificationDto } from '@app/shared/dto/messaging/push-notifications';
import { GoogleCalendarService } from '@app/shared/modules/google-calendar/google-calendar.service';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import {
  RABBIT_EXCHANGE,
  RmqService,
} from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp, getTwoNames } from '@app/shared/utils';
import { NotificationMessageBuilder } from '@app/shared/utils/notification-message-builder';
import { TZDate, tz } from '@date-fns/tz';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { addMinutes, format } from 'date-fns';
import { CreateAppointmentDto } from '../dto/requests/create-appointment.dto';

const BUSINESS_TZ_ID = 'America/Sao_Paulo';
const IN_TZ = tz(BUSINESS_TZ_ID);
const GOOGLE_CALENDAR_QUEUE =
  'api-gateway_professional_create-appointment_use-case.google_calendar-integration';

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rmqService: RmqService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async execute(payload: CreateAppointmentDto, req: AppRequest) {
    const { user, headers } = req;

    if (!user?.current_selected_business_id) {
      throw new UnauthorizedException('User not authorized');
    }

    const {
      appointment_date, // string ou Date representando horário LOCAL do negócio
      customer_id, // BusinessCustomer.id
      professional_id,
      service_id,
      notes,
    } = payload;

    // 1) Validar pertencimento ao negócio (em paralelo)
    const [service, professional, bc] = await Promise.all([
      this.prisma.service.findFirst({
        where: {
          id: service_id,
          businessId: user.current_selected_business_id,
        },
        select: {
          id: true,
          duration: true,
          name: true,
          price_in_cents: true,
        },
      }),
      this.prisma.professionalProfile.findFirst({
        where: {
          id: professional_id,
          business_id: user.current_selected_business_id,
        },
        select: {
          id: true,
          business_id: true,
          userId: true,
          User: { select: { name: true } },
        },
      }),
      this.prisma.businessCustomer.findFirst({
        where: {
          id: customer_id,
          businessId: user.current_selected_business_id,
        },
        select: {
          personId: true,
          person: {
            select: {
              user: { select: { push_token: true } },
            },
          },
        },
      }),
    ]);

    if (!service) {
      throw new UnauthorizedException(
        'O serviço não pertence ao negócio selecionado',
      );
    }
    if (!professional) {
      throw new UnauthorizedException(
        'O profissional não pertence ao negócio selecionado',
      );
    }
    if (!bc) {
      throw new BadRequestException(
        'O cliente informado não pertence ao negócio selecionado',
      );
    }

    if (!service.duration || service.duration <= 0) {
      throw new BadRequestException('Duração do serviço inválida.');
    }

    // 2) Interpretar a entrada como horário LOCAL (America/Sao_Paulo)
    const startLocal = this.toTZDateLocal(appointment_date);
    const endLocal = addMinutes(startLocal, service.duration) as TZDate;

    // Para persistir/consultar em UTC, use como Date normal (mesmo instante):
    const startUtc: Date = new Date(startLocal);
    const endUtc: Date = new Date(endLocal);

    // 3) Checar conflito por SOBREPOSIÇÃO no mesmo profissional
    // overlap se: (db.start < new.end) AND (db.end > new.start)
    const overlapping = await this.prisma.appointment.findFirst({
      where: {
        professionalProfileId: professional_id,
        start_at_utc: { lt: endUtc },
        end_at_utc: { gt: startUtc },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      select: { id: true },
    });

    if (overlapping) {
      throw new BadRequestException(
        'Já existe um agendamento que conflita com esse horário para este profissional.',
      );
    }

    // 4) Buscar configurações de lembretes do negócio e preparar jobs
    const reminderJobSettings =
      await this.prisma.businessReminderSettings.findFirst({
        where: { businessId: professional.business_id },
        select: {
          channels: true,
          offsets_min_before: true,
          timezone: true,
          businessId: true,
        },
      });

    const reminderJobs: {
      channel: string;
      due_at_utc: Date;
      personId: string;
      businessId: string;
    }[] = [];
    if (reminderJobSettings) {
      const nowUtc = new Date();
      for (const channel of reminderJobSettings.channels) {
        for (const offsetMin of reminderJobSettings.offsets_min_before) {
          const dueAtUtc = new Date(startLocal.getTime() - offsetMin * 60000);
          if (dueAtUtc <= nowUtc) continue;
          reminderJobs.push({
            channel,
            due_at_utc: dueAtUtc,
            personId: bc.personId,
            businessId: reminderJobSettings.businessId,
          } as any);
        }
      }
    }

    // 5) Criar o agendamento no novo formato
    const appointment = await this.prisma.appointment.create({
      data: {
        status: 'PENDING',
        start_at_utc: startUtc,
        end_at_utc: endUtc,
        duration_minutes: service.duration,
        timezone: BUSINESS_TZ_ID,
        start_offset_minutes: startLocal.getTimezoneOffset(),
        professional: { connect: { id: professional_id } },
        service: { connect: { id: service_id } },
        customerPerson: { connect: { id: bc.personId } },
        notes: notes || null,
        ...(reminderJobs.length > 0 && {
          ReminderJob: {
            createMany: { skipDuplicates: true, data: reminderJobs as any },
          },
        }),
        events: {
          create: {
            event_type: 'CREATED',
            by_professional: true,
            by_user_id: user.id,
            ip: getClientIp(req),
            user_agent: headers['user-agent'],
          },
        },
      },
      select: {
        id: true,
      },
    });

    // 6) Publicar evento para integração com Google Calendar (assíncrono)
    const integrationUserId = professional.userId;
    if (integrationUserId) {
      try {
        await this.rmqService.publishToQueue({
          routingKey: GOOGLE_CALENDAR_QUEUE,
          payload: {
            userId: integrationUserId,
            appointmentId: appointment.id,
          },
        });
      } catch (error) {
        // Falha na integração não deve impedir o agendamento
        console.error(
          'Erro ao publicar evento para integração com Google Calendar:',
          error,
        );
      }
    }

    const customerPushToken = bc.person?.user?.push_token;
    if (customerPushToken) {
      const dayAndMonth = format(startLocal, 'dd/MM', { in: IN_TZ });
      const time = format(startLocal, 'HH:mm', { in: IN_TZ });
      const professionalName = getTwoNames(professional.User?.name || '');
      const message =
        NotificationMessageBuilder.buildAppointmentCreatedMessageForCustomer({
          professional_name: professionalName || 'Profissional',
          dayAndMonth,
          time,
          service_name: service.name,
        });

      await this.rmqService.publishToQueue({
        payload: new SendPushNotificationDto({
          pushTokens: [customerPushToken],
          title: message.title,
          body: message.body,
        }),
        routingKey: MESSAGING_QUEUES.PUSH_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
      });
    }

    return null;
  }

  /**
   * Converte entrada (Date ou string) para TZDate no fuso do negócio (America/Sao_Paulo),
   * interpretando a string como horário LOCAL (sem Z).
   */
  private toTZDateLocal(input: Date | string): TZDate {
    if (input instanceof Date) {
      return new TZDate(input, BUSINESS_TZ_ID);
    }
    // suporta "yyyy-MM-ddTHH:mm" ou "yyyy-MM-dd HH:mm" (sem Z)
    const iso = input.replace(' ', 'T');
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ]?(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      iso,
    );
    if (!m) {
      const d = new Date(input);
      if (isNaN(d.getTime())) {
        throw new BadRequestException(
          'Formato de data/hora inválido para appointment_date.',
        );
      }
      return new TZDate(d, BUSINESS_TZ_ID);
    }
    const [, y, mo, d, hh, mm, ss] = m.map(Number) as unknown as number[];
    return new TZDate(y, mo - 1, d, hh, mm, ss || 0, BUSINESS_TZ_ID);
  }

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    queue: GOOGLE_CALENDAR_QUEUE,
    routingKey: GOOGLE_CALENDAR_QUEUE,
  })
  async handleGoogleCalendarIntegration(msg: {
    userId?: string;
    appointmentId?: string;
  }) {
    try {
      const { userId, appointmentId } = msg || {};
      if (!userId || !appointmentId) return;

      // 1) Verificar se o usuário possui integração ativa com Google Calendar
      const integration = await this.prisma.userIntegration.findUnique({
        where: {
          id: `${userId}_GOOGLE_CALENDAR`,
        },
        select: {
          access_token: true,
          refresh_token: true,
          scope: true,
          token_type: true,
          expiry_date: true,
          raw_tokens: true,
        },
      });

      if (!integration) return;

      // 2) Buscar dados do agendamento
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          start_at_utc: true,
          end_at_utc: true,
          timezone: true,
          service: {
            select: {
              name: true,
            },
          },
          professional: {
            select: {
              id: true,
              business: {
                select: {
                  name: true,
                },
              },
            },
          },
          customerPerson: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!appointment) return;

      const tz = appointment.timezone || BUSINESS_TZ_ID;

      const startLocal = new TZDate(appointment.start_at_utc, tz);
      const endLocal = new TZDate(appointment.end_at_utc, tz);

      // 3) Montar tokens para o cliente OAuth
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

      // 4) Criar evento no Google Calendar
      const createdEvent = await this.googleCalendarService.createEvent({
        tokens,
        event: {
          summary: appointment.professional?.business?.name
            ? `Agendamento ${appointment.professional.business.name}`
            : 'Agendamento Marquei',
          description:
            appointment.service?.name && appointment.customerPerson?.name
              ? `${appointment.service.name} para o cliente ${appointment.customerPerson.name}`
              : (appointment.service?.name ??
                appointment.customerPerson?.name ??
                undefined),
          start: {
            dateTime: startLocal.toISOString(),
            timeZone: tz,
          },
          end: {
            dateTime: endLocal.toISOString(),
            timeZone: tz,
          },
        },
      });

      if (createdEvent?.id) {
        await this.prisma.appointment.update({
          where: { id: appointmentId },
          data: { google_calendar_event_id: createdEvent.id },
        });
      }
    } catch (error) {
      console.error(
        'Erro ao integrar agendamento com Google Calendar:',
        (error as any)?.response?.data || error,
      );
    }
  }
}
