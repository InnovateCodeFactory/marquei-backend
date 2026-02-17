import { PrismaService } from '@app/shared';
import { SendInAppNotificationDto } from '@app/shared/dto/messaging/in-app-notifications';
import { SendNewAppointmentProfessionalDto } from '@app/shared/dto/messaging/mail-notifications/send-new-appointment-professional.dto';
import { SendPushNotificationDto } from '@app/shared/dto/messaging/push-notifications';
import { AppointmentStatusEnum } from '@app/shared/enum';
import { GoogleCalendarService } from '@app/shared/modules/google-calendar/google-calendar.service';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import {
  RABBIT_EXCHANGE,
  RmqService,
} from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import { getTwoNames } from '@app/shared/utils';
import { NotificationMessageBuilder } from '@app/shared/utils/notification-message-builder';
import { Price } from '@app/shared/value-objects';
import { TZDate, tz } from '@date-fns/tz';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { addMinutes, format } from 'date-fns';
import { CreateCustomerAppointmentDto } from '../dto/requests/create-customer-appointment.dto';

const BUSINESS_TZ_ID = 'America/Sao_Paulo';
const IN_TZ = tz(BUSINESS_TZ_ID);
const GOOGLE_CALENDAR_QUEUE =
  'api-gateway_client_customer-appointments_use-case.google_calendar-integration';

@Injectable()
export class CreateAppointmentUseCase {
  private readonly logger = new Logger(CreateAppointmentUseCase.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly rmqService: RmqService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async execute(payload: CreateCustomerAppointmentDto, request: AppRequest) {
    const { appointment_date, professional_id, service_id, combo_id, notes } =
      payload;

    const hasServiceId = Boolean(service_id?.trim());
    const hasComboId = Boolean(combo_id?.trim());

    if (!hasServiceId && !hasComboId) {
      throw new BadRequestException(
        'Informe service_id ou combo_id para criar o agendamento.',
      );
    }

    if (hasServiceId && hasComboId) {
      throw new BadRequestException(
        'Informe apenas um entre service_id ou combo_id.',
      );
    }

    const professional = await this.prismaService.professionalProfile.findUnique({
      where: { id: professional_id },
      select: {
        id: true,
        business_id: true,
        userId: true,
        User: {
          select: {
            push_token: true,
            email: true,
            name: true,
          },
        },
      },
    });
    if (!professional) {
      throw new BadRequestException('Profissional inválido.');
    }

    const customerPerson = await this.prismaService.person.findUnique({
      where: { id: request.user.personId },
      select: { name: true },
    });
    const customerName = getTwoNames(customerPerson?.name || 'Cliente');

    let targetServiceId = service_id!;
    let targetDuration = 0;
    let targetName = '';
    let targetPriceInCents = 0;
    let targetComboId: string | null = null;
    let comboSnapshot: Record<string, unknown> | null = null;

    if (hasServiceId) {
      const [service, executesService] = await Promise.all([
        this.prismaService.service.findFirst({
          where: {
            id: service_id,
            businessId: professional.business_id,
            is_active: true,
          },
          select: { id: true, duration: true, name: true, price_in_cents: true },
        }),
        this.prismaService.professionalService.count({
          where: {
            professional_profile_id: professional_id,
            service_id: service_id,
            active: true,
          },
        }),
      ]);

      if (!service) {
        throw new BadRequestException('Serviço inválido.');
      }

      if (executesService < 1) {
        throw new BadRequestException(
          'Este profissional não executa o serviço selecionado.',
        );
      }

      targetServiceId = service.id;
      targetDuration = service.duration;
      targetName = service.name;
      targetPriceInCents = service.price_in_cents;
    } else {
      const [combo, executesCombo] = await Promise.all([
        this.prismaService.serviceCombo.findFirst({
          where: {
            id: combo_id,
            businessId: professional.business_id,
            is_active: true,
            deleted_at: null,
          },
          select: {
            id: true,
            name: true,
            final_duration_minutes: true,
            final_price_in_cents: true,
            items: {
              orderBy: { sort_order: 'asc' },
              select: {
                serviceId: true,
                price_in_cents_snapshot: true,
                duration_minutes_snapshot: true,
                sort_order: true,
                service: {
                  select: {
                    id: true,
                    name: true,
                    is_active: true,
                  },
                },
              },
            },
          },
        }),
        this.prismaService.professionalServiceCombo.count({
          where: {
            professional_profile_id: professional_id,
            service_combo_id: combo_id,
            active: true,
          },
        }),
      ]);

      if (!combo) {
        throw new BadRequestException('Combo inválido.');
      }

      const activeServicesCount = combo.items.filter(
        (item) => item.service?.is_active,
      ).length;
      if (activeServicesCount < 2) {
        throw new BadRequestException(
          'Combo indisponível para agendamento no momento.',
        );
      }

      if (executesCombo < 1) {
        throw new BadRequestException(
          'Este profissional não executa o combo selecionado.',
        );
      }

      const anchorService = combo.items.find((item) => item.service?.is_active);
      if (!anchorService) {
        throw new BadRequestException(
          'Combo sem serviços ativos para criar agendamento.',
        );
      }

      targetServiceId = anchorService.serviceId;
      targetDuration = combo.final_duration_minutes;
      targetName = combo.name;
      targetPriceInCents = combo.final_price_in_cents;
      targetComboId = combo.id;
      comboSnapshot = {
        combo_id: combo.id,
        combo_name: combo.name,
        final_price_in_cents: combo.final_price_in_cents,
        final_duration_minutes: combo.final_duration_minutes,
        services: combo.items.map((item) => ({
          service_id: item.serviceId,
          service_name: item.service?.name ?? 'Serviço',
          sort_order: item.sort_order,
          price_in_cents_snapshot: item.price_in_cents_snapshot,
          duration_minutes_snapshot: item.duration_minutes_snapshot,
        })),
      };
    }

    // 2) Interpreta a data de entrada como HORÁRIO LOCAL do negócio (SP)
    // Aceita Date ou string ISO (sem Z) vindo do app.
    const startLocal = this.toTZDateLocal(appointment_date);
    const endLocal = addMinutes(startLocal, targetDuration) as TZDate;

    // Para persistir/consultar em UTC, basta tratar TZDate como Date (mesmo instante):
    const startUtc: Date = new Date(startLocal);
    const endUtc: Date = new Date(endLocal);

    // 3) Checagem de conflito por SOBREPOSIÇÃO no mesmo profissional:
    // overlap se: (start_db < end_new) AND (end_db > start_new)
    const overlapping = await this.prismaService.appointment.findFirst({
      where: {
        professionalProfileId: professional_id,
        start_at_utc: { lt: endUtc },
        end_at_utc: { gt: startUtc },
        status: {
          in: [AppointmentStatusEnum.PENDING, AppointmentStatusEnum.CONFIRMED],
        },
      },
      select: { id: true },
    });

    if (overlapping) {
      throw new BadRequestException(
        'Já existe um agendamento que conflita com esse horário para este profissional.',
      );
    }

    const reminderJobSettings =
      await this.prismaService.businessReminderSettings.findFirst({
        where: {
          business: {
            professionals: {
              some: { id: professional_id },
            },
          },
        },
        select: {
          channels: true,
          offsets_min_before: true,
          timezone: true,
          businessId: true,
        },
      });

    const reminderJobs = [];
    if (reminderJobSettings) {
      const nowUtc = new Date();
      for (const channel of reminderJobSettings.channels) {
        for (const offsetMin of reminderJobSettings.offsets_min_before) {
          const dueAtUtc = new Date(startLocal.getTime() - offsetMin * 60000);
          // Evita criar lembretes já expirados (ex.: offset de 24h para agendamento em <24h)
          if (dueAtUtc <= nowUtc) continue;
          reminderJobs.push({
            channel,
            due_at_utc: dueAtUtc,
            personId: request.user.personId,
            businessId: reminderJobSettings.businessId,
          });
        }
      }
    }

    // 4) Cria o agendamento no novo formato (sempre UTC no banco)
    const appointment = await this.prismaService.appointment.create({
      data: {
        start_at_utc: startUtc,
        end_at_utc: endUtc,
        duration_minutes: targetDuration,
        timezone: BUSINESS_TZ_ID,

        professional: { connect: { id: professional_id } },
        status: 'PENDING',
        service: { connect: { id: targetServiceId } },
        ...(targetComboId
          ? {
              serviceCombo: { connect: { id: targetComboId } },
              combo_snapshot: comboSnapshot,
            }
          : {}),
        notes: notes || null,
        customerPerson: { connect: { id: request.user.personId } },
        start_offset_minutes: startLocal.getTimezoneOffset(),
        ...(reminderJobs?.length > 0 && {
          ReminderJob: {
            createMany: {
              skipDuplicates: true,
              data: reminderJobs,
            },
          },
        }),
      },
      select: {
        id: true,
      },
    });

    const pushTokens = professional.User?.push_token
      ? [professional.User.push_token]
      : [];

    // 5) Mensagens (formatar no fuso local de SP)
    const titleAndBody =
      NotificationMessageBuilder.buildAppointmentCreatedMessage({
        customer_name: customerName,
        dayAndMonth: format(startLocal, 'dd/MM', { in: IN_TZ }),
        time: format(startLocal, 'HH:mm', { in: IN_TZ }),
        service_name: targetName,
      });

    const durationHours = Math.floor(targetDuration / 60);
    const durationMinutes = targetDuration % 60;
    const durationFormatted =
      durationHours > 0
        ? `${durationHours}h ${durationMinutes}min`
        : `${durationMinutes}min`;
    const integrationUserId = professional.userId;

    await Promise.all([
      this.rmqService.publishToQueue({
        payload: new SendPushNotificationDto({
          pushTokens,
          body: titleAndBody.body,
          title: titleAndBody.title,
        }),
        routingKey: MESSAGING_QUEUES.PUSH_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
      }),
      this.rmqService.publishToQueue({
        payload: new SendInAppNotificationDto({
          title: titleAndBody.title,
          body: titleAndBody.body,
          professionalProfileId: professional_id,
        }),
        routingKey:
          MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
      }),
      this.rmqService.publishToQueue({
        payload: {
          business_id: professional.business_id,
          person_id: request.user.personId,
        },
        routingKey: 'check-customer-appointment-created',
      }),
      professional.User?.email
        ? this.rmqService.publishToQueue({
            payload: new SendNewAppointmentProfessionalDto({
              toName: getTwoNames(professional.User?.name || 'Profissional'),
              byName: customerName,
              serviceName: targetName,
              apptDate: format(startLocal, 'dd/MM/yyyy', { in: IN_TZ }),
              apptTime: format(startLocal, 'HH:mm', { in: IN_TZ }),
              price: new Price(targetPriceInCents).toCurrency(),
              clientNotes: notes || '-',
              to: professional.User.email,
              duration: durationFormatted,
            }),
            routingKey:
              MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_NEW_APPOINTMENT_MAIL_QUEUE,
          })
        : Promise.resolve(),
      this.rmqService.publishToQueue({
        routingKey: GOOGLE_CALENDAR_QUEUE,
        payload: {
          userId: integrationUserId,
          appointmentId: appointment.id,
        },
      }),
    ]);

    return null;
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

      // 1) Verificar se o usuário (profissional) possui integração ativa com Google Calendar
      const integration = await this.prismaService.userIntegration.findUnique({
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
      const appointment = await this.prismaService.appointment.findUnique({
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
          serviceCombo: {
            select: {
              name: true,
            },
          },
          professional: {
            select: {
              business: {
                select: { name: true },
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

      const tzId = appointment.timezone || BUSINESS_TZ_ID;

      const startLocal = new TZDate(appointment.start_at_utc, tzId);
      const endLocal = new TZDate(appointment.end_at_utc, tzId);

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
            (appointment.serviceCombo?.name || appointment.service?.name) &&
            appointment.customerPerson?.name
              ? `${appointment.serviceCombo?.name || appointment.service?.name} para o cliente ${appointment.customerPerson.name}`
              : (appointment.serviceCombo?.name ??
                appointment.service?.name ??
                appointment.customerPerson?.name ??
                undefined),
          start: {
            dateTime: startLocal.toISOString(),
            timeZone: tzId,
          },
          end: {
            dateTime: endLocal.toISOString(),
            timeZone: tzId,
          },
        },
      });

      if (createdEvent?.id) {
        await this.prismaService.appointment.update({
          where: { id: appointmentId },
          data: { google_calendar_event_id: createdEvent.id },
        });
      }
    } catch (error) {
      this.logger.error(
        'Erro ao integrar agendamento (cliente) com Google Calendar:',
        (error as any)?.response?.data || error,
      );
    }
  }

  private toTZDateLocal(input: Date | string): TZDate {
    if (input instanceof Date) {
      // Se vier Date, usamos o mesmo instante, mas "visto" no fuso local:
      return new TZDate(input, BUSINESS_TZ_ID);
    }

    // String: suportar "yyyy-MM-ddTHH:mm" ou "yyyy-MM-dd HH:mm"
    const iso = input.replace(' ', 'T');
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ]?(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      iso,
    );
    if (!m) {
      // fallback: deixar o JS interpretar e então projetar no fuso
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
    queue: 'check-customer-appointment-created',
    routingKey: 'check-customer-appointment-created',
  })
  async handleCustomerAppointmentCreatedMessage({
    business_id,
    person_id,
  }: {
    person_id: string;
    business_id: string;
  }) {
    this.logger.debug(
      `Processing check-customer-appointment-created message for business ID ${business_id} and person ID ${person_id}`,
    );
    try {
      const isCustomerAlreadyLinked =
        await this.prismaService.businessCustomer.findFirst({
          where: { businessId: business_id, personId: person_id },
          select: { id: true },
        });

      if (!isCustomerAlreadyLinked?.id) {
        const customer = await this.prismaService.person.findUnique({
          where: { id: person_id },
          select: { phone: true, email: true },
        });

        await this.prismaService.businessCustomer.create({
          data: {
            businessId: business_id,
            personId: person_id,
            email: customer?.email || '',
            phone: customer?.phone || '',
            verified: true,
          },
        });
        this.logger.debug(
          `Customer with person ID ${person_id} linked to business ID ${business_id}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Error processing check-customer-appointment-created message: ${error.message}`,
      );
    }
  }
}
