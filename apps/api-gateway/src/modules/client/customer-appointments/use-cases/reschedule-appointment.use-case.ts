import { PrismaService } from '@app/shared';
import { SendInAppNotificationDto } from '@app/shared/dto/messaging/in-app-notifications';
import { SendPushNotificationDto } from '@app/shared/dto/messaging/push-notifications';
import { GoogleCalendarService } from '@app/shared/modules/google-calendar/google-calendar.service';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import { getTwoNames } from '@app/shared/utils';
import { TZDate, tz } from '@date-fns/tz';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { addMinutes, format } from 'date-fns';
import { RescheduleCustomerAppointmentDto } from '../dto/requests/reschedule-appointment.dto';
import { ReminderChannel } from '@prisma/client';

const BUSINESS_TZ_ID = 'America/Sao_Paulo';
const IN_TZ = tz(BUSINESS_TZ_ID);

@Injectable()
export class RescheduleCustomerAppointmentUseCase {
  private readonly logger = new Logger(RescheduleCustomerAppointmentUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rmqService: RmqService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async execute(dto: RescheduleCustomerAppointmentDto, req: AppRequest) {
    const personId = req.user?.personId;
    if (!personId) throw new ForbiddenException('Unauthorized');

    // 1) pega o agendamento + tudo que a gente precisa
    const current = await this.prisma.appointment.findUnique({
      where: { id: dto.appointment_id },
      select: {
        id: true,
        personId: true,
        service_id: true,
        professionalProfileId: true,
        google_calendar_event_id: true,
        service: {
          select: {
            id: true,
            duration: true,
            name: true,
          },
        },
        professional: {
          select: {
            id: true,
            push_notification_enabled: true,
            business_id: true,
            userId: true,
            business: { select: { name: true } },
            User: {
              select: {
                push_token: true,
                name: true,
              },
            },
          },
        },
        customerPerson: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!current) throw new NotFoundException('Appointment not found');
    if (current.personId !== personId)
      throw new ForbiddenException('Not allowed');

    // decidir se trocou de serviço ou profissional
    const newServiceId = dto.service_id ?? current.service_id;
    const newProfessionalId =
      dto.professional_id ?? current.professionalProfileId;

    // serviço efetivo (pode ser o mesmo ou outro)
    let effectiveService = current.service;
    if (newServiceId !== current.service_id) {
      effectiveService = await this.prisma.service.findUnique({
        where: { id: newServiceId },
        select: { duration: true, name: true, id: true },
      });
      if (!effectiveService) {
        throw new BadRequestException('Serviço inválido.');
      }
    }

    // profissional efetivo (pode ser o mesmo ou outro)
    let effectiveProfessional = current.professional;
    if (newProfessionalId !== current.professionalProfileId) {
      effectiveProfessional = await this.prisma.professionalProfile.findUnique({
        where: { id: newProfessionalId },
        select: {
          id: true,
          push_notification_enabled: true,
          business_id: true,
          userId: true,
          business: { select: { name: true } },
          User: { select: { push_token: true, name: true } },
        },
      });

      if (!effectiveProfessional) {
        throw new BadRequestException('Profissional inválido.');
      }
    }

    // 2) calcula horários no timezone do negócio
    const startLocal = this.toTZDateLocal(dto.new_date);
    const endLocal = addMinutes(
      startLocal,
      effectiveService.duration,
    ) as TZDate;

    const startUtc = new Date(startLocal);
    const endUtc = new Date(endLocal);

    // 3) checar conflito de agenda do profissional alvo
    const overlapping = await this.prisma.appointment.findFirst({
      where: {
        id: { not: current.id },
        professionalProfileId: newProfessionalId,
        start_at_utc: { lt: endUtc },
        end_at_utc: { gt: startUtc },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { id: true },
    });

    if (overlapping) {
      throw new BadRequestException(
        'Já existe um agendamento que conflita com esse horário para este profissional.',
      );
    }

    // 4) atualiza o agendamento
    const reminderSettings =
      await this.prisma.businessReminderSettings.findFirst({
        where: {
          businessId: effectiveProfessional.business_id,
          is_active: true,
        },
        select: {
          channels: true,
          offsets_min_before: true,
          businessId: true,
        },
      });

    const reminderJobs: {
      channel: ReminderChannel;
      due_at_utc: Date;
      personId: string;
      businessId: string;
      appointmentId: string;
    }[] = [];

    if (reminderSettings) {
      const nowUtc = new Date();
      for (const channel of reminderSettings.channels) {
        for (const offsetMin of reminderSettings.offsets_min_before) {
          const dueAtUtc = new Date(startLocal.getTime() - offsetMin * 60000);
          if (dueAtUtc <= nowUtc) continue;
          reminderJobs.push({
            channel,
            due_at_utc: dueAtUtc,
            personId: current.personId,
            businessId: reminderSettings.businessId,
            appointmentId: current.id,
          });
        }
      }
    }

    await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: current.id },
        data: {
          start_at_utc: startUtc,
          end_at_utc: endUtc,
          duration_minutes: effectiveService.duration,
          timezone: BUSINESS_TZ_ID,
          start_offset_minutes: startLocal.getTimezoneOffset(),
          ...(dto.professional_id && {
            professionalProfileId: newProfessionalId,
          }),
          ...(dto.service_id && { service_id: newServiceId }),
        },
      }),
      this.prisma.reminderJob.updateMany({
        where: {
          appointmentId: current.id,
          status: { in: ['PENDING', 'SCHEDULED'] },
        },
        data: {
          status: 'CANCELED',
          error: 'appointment_rescheduled',
        },
      }),
      ...(reminderJobs.length > 0
        ? [
            this.prisma.reminderJob.createMany({
              data: reminderJobs,
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    // 5) montar mensagem
    const customerName = getTwoNames(current.customerPerson?.name || 'Cliente');
    const dayAndMonth = format(startLocal, 'dd/MM', { in: IN_TZ });
    const time = format(startLocal, 'HH:mm', { in: IN_TZ });
    const serviceName = (effectiveService.name || '').trim();

    const title = '🔁 Agendamento atualizado';
    const body = `${customerName} reagendou ${serviceName} para ${dayAndMonth} às ${time}.`;

    // 6) push e in-app notifications
    // regra: só manda push se o profissional habilitou push_notification_enabled
    // e se existir push_token
    const allowPush = effectiveProfessional?.push_notification_enabled === true;

    const pushTokens =
      allowPush && effectiveProfessional?.User?.push_token
        ? [effectiveProfessional.User.push_token]
        : [];

    await Promise.all([
      pushTokens.length
        ? this.rmqService.publishToQueue({
            payload: new SendPushNotificationDto({
              pushTokens,
              title,
              body,
            }),
            routingKey:
              MESSAGING_QUEUES.PUSH_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
          })
        : Promise.resolve(),
      this.rmqService.publishToQueue({
        payload: new SendInAppNotificationDto({
          title,
          body,
          professionalProfileId: newProfessionalId,
        }),
        routingKey:
          MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
      }),
    ]);

    if (current.google_calendar_event_id) {
      try {
        const buildTokens = async (userId: string) => {
          const integration = await this.prisma.userIntegration.findUnique({
            where: { id: `${userId}_GOOGLE_CALENDAR` },
            select: {
              access_token: true,
              refresh_token: true,
              scope: true,
              token_type: true,
              expiry_date: true,
              raw_tokens: true,
            },
          });

          if (!integration) return null;

          return {
            ...(integration.raw_tokens as any),
            access_token: integration.access_token ?? undefined,
            refresh_token: integration.refresh_token ?? undefined,
            scope: integration.scope ?? undefined,
            token_type: integration.token_type ?? undefined,
            expiry_date: integration.expiry_date
              ? integration.expiry_date.getTime()
              : undefined,
          };
        };

        const tzId = BUSINESS_TZ_ID;
        const professionalChanged =
          newProfessionalId !== current.professionalProfileId;

        if (professionalChanged && current.professional?.userId) {
          const oldTokens = await buildTokens(current.professional.userId);
          if (oldTokens) {
            await this.googleCalendarService.deleteEvent({
              tokens: oldTokens,
              eventId: current.google_calendar_event_id,
            });
          }

          if (effectiveProfessional?.userId) {
            const newTokens = await buildTokens(effectiveProfessional.userId);
            if (newTokens) {
              const createdEvent = await this.googleCalendarService.createEvent({
                tokens: newTokens,
                event: {
                  summary: effectiveProfessional?.business?.name
                    ? `Agendamento ${effectiveProfessional.business.name}`
                    : 'Agendamento Marquei',
                  description:
                    effectiveService?.name && current.customerPerson?.name
                      ? `${effectiveService.name} para o cliente ${current.customerPerson.name}`
                      : (effectiveService?.name ??
                        current.customerPerson?.name ??
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
                await this.prisma.appointment.update({
                  where: { id: current.id },
                  data: { google_calendar_event_id: createdEvent.id },
                });
              }
            }
          }
        } else if (current.professional?.userId) {
          const tokens = await buildTokens(current.professional.userId);
          if (tokens) {
            await this.googleCalendarService.updateEvent({
              tokens,
              eventId: current.google_calendar_event_id,
              event: {
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
          }
        }
      } catch (error) {
        this.logger.error(
          'Erro ao atualizar evento no Google Calendar (cliente):',
          (error as any)?.response?.data || error,
        );
      }
    }

    return null;
  }

  private toTZDateLocal(input: Date | string): TZDate {
    if (input instanceof Date) {
      return new TZDate(input, BUSINESS_TZ_ID);
    }
    const iso = input.replace(' ', 'T');
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ]?(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      iso,
    );
    if (!m) {
      const d = new Date(input);
      if (isNaN(d.getTime())) {
        throw new BadRequestException(
          'Formato de data/hora inválido para new_date.',
        );
      }
      return new TZDate(d, BUSINESS_TZ_ID);
    }
    const [, y, mo, d, hh, mm, ss] = m.map(Number) as unknown as number[];
    return new TZDate(y, mo - 1, d, hh, mm, ss || 0, BUSINESS_TZ_ID);
  }
}
