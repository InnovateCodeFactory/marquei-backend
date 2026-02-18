import { PrismaService } from '@app/shared';
import { systemGeneralSettings } from '@app/shared/config/system-general-settings';
import { SendPushNotificationDto } from '@app/shared/dto/messaging/push-notifications';
import { SendWhatsAppTextMessageDto } from '@app/shared/dto/messaging/whatsapp-notifications';
import { AppointmentStatusEnum } from '@app/shared/enum';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import {
  BUSINESS_REMINDER_TYPE_DEFAULTS,
  getTwoNames,
  renderBusinessNotificationTemplate,
} from '@app/shared/utils';
import { NotificationMessageBuilder } from '@app/shared/utils/notification-message-builder';
import { tz } from '@date-fns/tz';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BusinessReminderType } from '@prisma/client';
import { RedisLockService } from 'apps/scheduler/src/infrastructure/locks/redis-lock.service';
import { addDays, format } from 'date-fns';

@Injectable()
export class ScheduleReminderUseCase implements OnModuleInit {
  private readonly logger = new Logger(ScheduleReminderUseCase.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly rmqService: RmqService,
    private readonly redisLockService: RedisLockService,
  ) {}

  async onModuleInit() {
    // await this.execute();
  }

  // Executa a cada 1 minuto; o lock de Redis evita concorrência.
  @Cron(CronExpression.EVERY_MINUTE, {
    timeZone: 'America/Sao_Paulo',
  })
  async execute() {
    // Lock simples para evitar concorrência entre instâncias
    // TTL curto + release explícito permite rodar a cada minuto sem overlap
    const lock = await this.redisLockService.tryAcquire({
      key: 'lock:schedule-reminders',
      ttlInSeconds: 90, // 1.5 minutos
    });
    if (!lock) return;

    try {
      const nowUtc = new Date();
      const GRACE_MIN = 5; // tolera atrasos e stagger (evita late_due indevido)
      const dueLte = new Date(nowUtc.getTime());
      const dueGte = new Date(nowUtc.getTime() - GRACE_MIN * 60_000);

      // Marca jobs muito antigos como SKIPPED para não disparar reminders atrasados
      await this.prismaService.reminderJob.updateMany({
        where: {
          status: { in: ['PENDING', 'SCHEDULED'] },
          due_at_utc: { lt: dueGte },
        },
        data: { status: 'SKIPPED', error: 'late_due' },
      });

      const BATCH = 300;
      let lastId: string | null = null;

      while (true) {
        // Renova o lock para execuções mais longas
        await lock.renew(90).catch(() => void 0);
        const jobs = await this.prismaService.reminderJob.findMany({
          where: {
            status: { in: ['PENDING', 'SCHEDULED'] },
            due_at_utc: { lte: dueLte, gte: dueGte },
          },
          select: {
            id: true,
            businessId: true,
            appointmentId: true,
            personId: true,
            channel: true,
            due_at_utc: true,
            status: true,
            appointment: {
              select: {
                id: true,
                start_at_utc: true,
                timezone: true,
                status: true,
                service: { select: { name: true } },
                professional: {
                  select: {
                    User: { select: { name: true } },
                    business: { select: { name: true } },
                  },
                },
              },
            },
            person: {
              select: {
                phone: true,
                user: { select: { push_token: true, name: true } },
              },
            },
          },
          orderBy: [{ due_at_utc: 'asc' }, { id: 'asc' }],
          take: BATCH,
          ...(lastId && { skip: 1, cursor: { id: lastId } }),
        });

        if (!jobs.length) break;

        const businessIds = Array.from(
          new Set(jobs.map((job) => job.businessId)),
        );
        const reminderSettings =
          await this.prismaService.businessReminderSettings.findMany({
            where: {
              businessId: { in: businessIds },
              is_active: true,
              type: BusinessReminderType.APPOINTMENT_REMINDER,
            },
            select: {
              businessId: true,
              offsets_min_before: true,
              message_template: true,
            },
          });
        const settingsByBusiness = new Map(
          reminderSettings.map((item) => [item.businessId, item]),
        );

        const pairKeys = new Set<string>();
        for (const job of jobs) {
          if (job.businessId && job.personId) {
            pairKeys.add(`${job.businessId}:${job.personId}`);
          }
        }
        const businessCustomers = pairKeys.size
          ? await this.prismaService.businessCustomer.findMany({
              where: {
                OR: Array.from(pairKeys).map((key) => {
                  const [businessId, personId] = key.split(':');
                  return { businessId, personId };
                }),
              },
              select: {
                businessId: true,
                personId: true,
                verified: true,
              },
            })
          : [];
        const businessCustomerMap = new Map(
          businessCustomers.map((bc) => [
            `${bc.businessId}:${bc.personId}`,
            bc,
          ]),
        );

        // Agrupa por (appointmentId + due_at_utc) para aplicar stagger entre canais simultâneos
        const groups = new Map<string, typeof jobs>();
        for (const j of jobs) {
          const key = `${j.appointmentId}|${j.due_at_utc.getTime()}`;
          const arr = groups.get(key) ?? [];
          arr.push(j);
          groups.set(key, arr);
        }

        for (const [, groupJobs] of groups) {
          // Preferência de ordem: PUSH primeiro, depois WHATSAPP
          const pushJob = groupJobs.find((j) => j.channel === 'PUSH');
          const whatsappJob = groupJobs.find((j) => j.channel === 'WHATSAPP');

          // Utilitários para construir mensagem e envio
          const base = groupJobs[0];
          const appt = base.appointment;
          const person = base.person;
          const settings = settingsByBusiness.get(base.businessId);

          const markSkipped = async (jobId: string, reason: string) => {
            await this.prismaService.reminderJob.update({
              where: { id: jobId },
              data: {
                status: 'SKIPPED',
                error: reason,
                attempts: { increment: 1 },
              },
            });
          };

          const skipGroup = async (reason: string) => {
            await Promise.all(
              groupJobs.map((job) => markSkipped(job.id, reason)),
            );
          };

          if (!appt) {
            await skipGroup('appointment_missing');
            continue;
          }

          if (
            ![
              AppointmentStatusEnum.PENDING,
              AppointmentStatusEnum.CONFIRMED,
            ].includes(appt.status as AppointmentStatusEnum)
          ) {
            await skipGroup('appointment_status_invalid');
            continue;
          }

          if (!settings?.offsets_min_before?.length) {
            await skipGroup('missing_reminder_settings');
            continue;
          }

          const deltaMinutes = Math.round(
            (appt.start_at_utc.getTime() - base.due_at_utc.getTime()) / 60000,
          );
          if (deltaMinutes <= 0) {
            await skipGroup('appointment_time_invalid');
            continue;
          }

          const toleranceMinutes = 3; // tolera pequenos ajustes e stagger
          const matchesOffset = settings.offsets_min_before.some(
            (offset) => Math.abs(offset - deltaMinutes) <= toleranceMinutes,
          );
          if (!matchesOffset) {
            await skipGroup('appointment_rescheduled');
            continue;
          }
          const tzid = appt?.timezone || 'America/Sao_Paulo';
          const inTZ = tz(tzid);
          const dayAndMonthFormatted = format(appt.start_at_utc, 'dd/MM', {
            in: inTZ,
          });
          const todayFormatted = format(nowUtc, 'dd/MM', { in: inTZ });
          const tomorrowFormatted = format(addDays(nowUtc, 1), 'dd/MM', {
            in: inTZ,
          });
          const dayAndMonth =
            dayAndMonthFormatted === todayFormatted
              ? 'hoje'
              : dayAndMonthFormatted === tomorrowFormatted
                ? 'amanhã'
                : dayAndMonthFormatted;
          const time = format(appt.start_at_utc, 'HH:mm', { in: inTZ });
          const professionalName = appt.professional?.User?.name || '';
          const serviceName = appt.service?.name || '';
          const defaultReminderMessage =
            NotificationMessageBuilder.buildAppointmentReminderMessageForCustomer(
              {
                professional_name: professionalName,
                dayAndMonth,
                time,
                service_name: serviceName,
              },
            );
          const bcKey = base.personId
            ? `${base.businessId}:${base.personId}`
            : null;
          const isVerified = bcKey
            ? businessCustomerMap.get(bcKey)?.verified === true
            : true;

          const iosLink = systemGeneralSettings.marquei_app_store_url ?? '';
          const androidLink =
            systemGeneralSettings.marquei_play_store_url ?? '';
          const signupFooter = !isVerified
            ? this.buildSignupFooter({ iosLink, androidLink })
            : '';
          const dayWithPreposition =
            dayAndMonth === 'hoje' || dayAndMonth === 'amanhã'
              ? dayAndMonth
              : `em ${dayAndMonth}`;

          const signupHint = isVerified
            ? ''
            : '\n\nCaso ainda não tenha conta no Marquei Clientes, crie a sua para confirmar e acompanhar seus agendamentos.';

          const appDownloadLinks =
            !isVerified
              ? this.buildAppDownloadLinks({ iosLink, androidLink })
              : '';

          const template =
            settings?.message_template?.trim() ||
            BUSINESS_REMINDER_TYPE_DEFAULTS[
              BusinessReminderType.APPOINTMENT_REMINDER
            ].message_template;
          const renderedReminderBody = renderBusinessNotificationTemplate({
            template,
            variables: {
              business_name: appt.professional?.business?.name || '',
              customer_name: person.user?.name || '',
              professional_name: getTwoNames(professionalName),
              service_name: serviceName,
              day: dayAndMonth,
              day_with_preposition: dayWithPreposition,
              time,
              client_app_url: systemGeneralSettings.website_client_url || '',
              ios_app_url: iosLink,
              android_app_url: androidLink,
              signup_hint: signupHint,
              app_download_links: appDownloadLinks,
            },
          });

          const reminderBody =
            renderedReminderBody || defaultReminderMessage.body;
          const msg = {
            title: defaultReminderMessage.title,
            body: reminderBody,
          };
          const whatsappMessage = this.ensureSignupFooter({
            message: msg.body,
            shouldSuggestSignup: !isVerified,
            signupFooter,
            iosLink,
            androidLink,
          });

          const STAGGER_MS = 2 * 60_000; // 2 minutos

          // Funções auxiliares de envio/atualização
          const markSent = async (jobId: string) => {
            await this.prismaService.reminderJob.update({
              where: { id: jobId },
              data: {
                status: 'SENT',
                sent_at_utc: new Date(),
                error: null,
                attempts: { increment: 1 },
              },
            });
            await this.prismaService.appointmentEvent.create({
              data: {
                appointmentId: appt.id,
                event_type: 'REMINDER_SENT',
                by_professional: false,
                by_user_id: null,
                reason: 'reminder',
              },
            });
          };

          const markFailed = async (jobId: string, errorMsg: string) => {
            await this.prismaService.reminderJob.update({
              where: { id: jobId },
              data: {
                status: 'FAILED',
                error: errorMsg,
                attempts: { increment: 1 },
              },
            });
            await this.prismaService.appointmentEvent.create({
              data: {
                appointmentId: appt.id,
                event_type: 'REMINDER_FAILED',
                by_professional: false,
                by_user_id: null,
                reason: errorMsg?.slice(0, 200) || 'error',
              },
            });
          };

          const scheduleLater = async (jobId: string, fromDue: Date) => {
            // Reagenda relativo ao presente para evitar cair no "late_due"
            // quando o due original já está no passado.
            const baseMs = Math.max(Date.now(), fromDue.getTime());
            const newDue = new Date(baseMs + STAGGER_MS);
            await this.prismaService.reminderJob.update({
              where: { id: jobId },
              data: {
                status: 'SCHEDULED',
                scheduled_at_utc: new Date(),
                due_at_utc: newDue,
              },
            });
          };

          // Decide envios, evitando simultaneidade
          const bothPresent = !!pushJob && !!whatsappJob;

          // Helper para enviar push
          const trySendPush = async (job: typeof pushJob) => {
            if (!job) return false;
            const token = person.user?.push_token;
            if (!token) {
              await markSkipped(job.id, 'missing_push_token');
              return false;
            }
            try {
              await this.rmqService.publishToQueue({
                routingKey:
                  MESSAGING_QUEUES.PUSH_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
                payload: new SendPushNotificationDto({
                  pushTokens: [token],
                  title: msg.title,
                  body: msg.body,
                }),
              });
              await markSent(job.id);
              return true;
            } catch (err: any) {
              await markFailed(job.id, err?.message || 'push_send_error');
              return false;
            }
          };

          // Helper para enviar whatsapp
          const trySendWhatsApp = async (job: typeof whatsappJob) => {
            if (!job) return false;
            const phone = person.phone;
            if (!phone) {
              await markSkipped(job.id, 'missing_phone_number');
              return false;
            }
            try {
              await this.rmqService.publishToQueue({
                routingKey:
                  MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS
                    .SEND_TEXT_MESSAGE_QUEUE,
                payload: new SendWhatsAppTextMessageDto({
                  phone_number: phone,
                  message: whatsappMessage,
                }),
              });
              await markSent(job.id);
              return true;
            } catch (err: any) {
              await markFailed(job.id, err?.message || 'whatsapp_send_error');
              return false;
            }
          };

          // Fluxo principal com stagger
          if (bothPresent) {
            const pushSent = await trySendPush(pushJob);
            if (pushSent) {
              // Se push foi enviado agora, reagenda o WhatsApp para alguns minutos depois
              await scheduleLater(whatsappJob.id, whatsappJob.due_at_utc);
            } else {
              // Se não conseguimos push (token ausente/erro), tenta WhatsApp imediatamente
              await trySendWhatsApp(whatsappJob);
            }
          } else if (pushJob) {
            await trySendPush(pushJob);
          } else if (whatsappJob) {
            await trySendWhatsApp(whatsappJob);
          }
        }

        lastId = jobs[jobs.length - 1].id;
        if (jobs.length < BATCH) break;
      }
    } catch (error) {
      this.logger.error('Erro no agendamento de reminders', error);
    } finally {
      await lock.release();
    }
  }

  private buildAppDownloadLinks({
    iosLink,
    androidLink,
  }: {
    iosLink: string;
    androidLink: string;
  }) {
    const links = [
      iosLink ? `• iOS: ${iosLink}` : null,
      androidLink ? `• Android: ${androidLink}` : null,
    ].filter(Boolean);

    if (!links.length) return '';
    return `\n\nBaixe o app:\n${links.join('\n')}`;
  }

  private buildSignupFooter({
    iosLink,
    androidLink,
  }: {
    iosLink: string;
    androidLink: string;
  }) {
    const links = [
      iosLink ? `• iOS: ${iosLink}` : null,
      androidLink ? `• Android: ${androidLink}` : null,
    ].filter(Boolean);

    const lines = [
      'Caso ainda não tenha conta no Marquei Clientes, crie a sua para confirmar e acompanhar seus agendamentos.',
      links.length ? 'Baixe o app:' : null,
      ...links,
    ].filter(Boolean);

    return lines.join('\n');
  }

  private ensureSignupFooter({
    message,
    shouldSuggestSignup,
    signupFooter,
    iosLink,
    androidLink,
  }: {
    message: string;
    shouldSuggestSignup: boolean;
    signupFooter: string;
    iosLink: string;
    androidLink: string;
  }) {
    if (!shouldSuggestSignup || !signupFooter) return message;

    const normalized = message?.trim() || '';
    if (!normalized) return signupFooter;

    const hasCta = /ainda não tenha conta no marquei clientes/i.test(normalized);
    const hasIos = iosLink ? normalized.includes(iosLink) : true;
    const hasAndroid = androidLink ? normalized.includes(androidLink) : true;

    if (hasCta && hasIos && hasAndroid) return normalized;
    return `${normalized}\n\n${signupFooter}`.trim();
  }
}
