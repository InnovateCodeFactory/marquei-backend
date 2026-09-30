import { PrismaService } from '@app/shared';
import { SendPushNotificationDto } from '@app/shared/dto/messaging/push-notifications';
import { SendWhatsAppTextMessageDto } from '@app/shared/dto/messaging/whatsapp-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import {
  BUSINESS_REMINDER_TYPE_DEFAULTS,
  getAvailableCredits,
  PLAN_REMINDER_TYPES,
} from '@app/shared/utils';
import { NotificationMessageBuilder } from '@app/shared/utils/notification-message-builder';
import { tz } from '@date-fns/tz';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BusinessReminderType, Prisma } from '@prisma/client';
import { RedisLockService } from '@app/shared/services';
import { addDays, format } from 'date-fns';

const LATE_DUE_GRACE_MIN = 6 * 60;
const STAGGER_MS = 2 * 60_000;
const OFFSET_TOLERANCE_MIN = 3;
const CYCLE_ENDING_LOOKAHEAD_DAYS = 7;

const PLAN_REMINDER_JOB_SELECT = {
  id: true,
  type: true,
  channel: true,
  due_at_utc: true,
  customerPlanSubscriptionId: true,
  cycleId: true,
  appointmentId: true,
  appointment: {
    select: { id: true, start_at_utc: true, status: true, timezone: true },
  },
  customerPlanSubscription: {
    select: {
      status: true,
      current_cycle_end: true,
      business: { select: { name: true } },
      plan: { select: { name: true } },
      cycles: {
        orderBy: { cycle_start: 'desc' },
        take: 1,
        select: {
          id: true,
          credits_granted: true,
          credits_reserved: true,
          credits_consumed: true,
          credits_refunded: true,
        },
      },
    },
  },
  person: {
    select: { phone: true, user: { select: { push_token: true } } },
  },
  businessId: true,
} satisfies Prisma.ReminderJobSelect;

type PlanReminderJob = Prisma.ReminderJobGetPayload<{
  select: typeof PLAN_REMINDER_JOB_SELECT;
}>;

/**
 * Lembretes de plano do cliente (a assinatura não renova sozinha):
 * - PLAN_LAST_APPOINTMENT: jobs criados pelo CustomerPlanCreditService quando a
 *   reserva esgota os créditos do ciclo; aqui só são validados e enviados.
 * - PLAN_CYCLE_ENDING: jobs gerados aqui, N dias antes do fim do ciclo.
 * Reaproveita a tabela ReminderJob e as filas de push/WhatsApp dos lembretes
 * de agendamento comuns.
 */
@Injectable()
export class SchedulePlanReminderUseCase {
  private readonly logger = new Logger(SchedulePlanReminderUseCase.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly rmqService: RmqService,
    private readonly redisLockService: RedisLockService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'America/Sao_Paulo' })
  async execute() {
    const lock = await this.redisLockService.tryAcquire({
      key: 'lock:schedule-plan-reminders',
      ttlInSeconds: 90,
    });
    if (!lock) return;

    try {
      await this.generateCycleEndingJobs();
      await lock.renew(90).catch(() => void 0);
      await this.dispatchDueJobs();
    } catch (error) {
      this.logger.error('Erro nos lembretes de plano', error);
    } finally {
      await lock.release();
    }
  }

  private async generateCycleEndingJobs() {
    const type = BusinessReminderType.PLAN_CYCLE_ENDING;
    const defaults = BUSINESS_REMINDER_TYPE_DEFAULTS[type];
    const now = new Date();

    const subscriptions =
      await this.prismaService.customerPlanSubscription.findMany({
        where: {
          status: 'ACTIVE',
          current_cycle_end: {
            gt: now,
            lte: addDays(now, CYCLE_ENDING_LOOKAHEAD_DAYS),
          },
        },
        select: {
          id: true,
          businessId: true,
          personId: true,
          current_cycle_end: true,
          cycles: {
            orderBy: { cycle_start: 'desc' },
            take: 1,
            select: { id: true },
          },
        },
        take: 1000,
      });
    if (!subscriptions.length) return;

    const settings = await this.prismaService.businessReminderSettings.findMany(
      {
        where: {
          businessId: {
            in: Array.from(new Set(subscriptions.map((s) => s.businessId))),
          },
          type,
        },
        select: {
          businessId: true,
          is_active: true,
          channels: true,
          offsets_min_before: true,
        },
      },
    );
    const settingsByBusiness = new Map(settings.map((s) => [s.businessId, s]));

    for (const subscription of subscriptions) {
      const cycleId = subscription.cycles[0]?.id;
      if (!cycleId) continue;

      const config = settingsByBusiness.get(subscription.businessId);
      if (config && !config.is_active) continue;

      const channels = config?.channels?.length
        ? config.channels
        : defaults.channels;
      const offsets = config?.offsets_min_before?.length
        ? config.offsets_min_before
        : defaults.offsets_min_before;
      const triggerAt =
        subscription.current_cycle_end.getTime() -
        Math.max(...offsets) * 60_000;
      if (now.getTime() < triggerAt) continue;

      for (const channel of channels) {
        await this.prismaService.reminderJob.upsert({
          where: {
            uq_job_plan_cycle_type_channel: {
              customerPlanSubscriptionId: subscription.id,
              cycleId,
              type,
              channel,
            },
          },
          create: {
            businessId: subscription.businessId,
            personId: subscription.personId,
            customerPlanSubscriptionId: subscription.id,
            cycleId,
            type,
            channel,
            due_at_utc: now,
          },
          update: {},
        });
      }
    }
  }

  private async dispatchDueJobs() {
    const now = new Date();
    const graceStart = new Date(now.getTime() - LATE_DUE_GRACE_MIN * 60_000);

    await this.prismaService.reminderJob.updateMany({
      where: {
        type: { in: [...PLAN_REMINDER_TYPES] },
        status: { in: ['PENDING', 'SCHEDULED'] },
        due_at_utc: { lt: graceStart },
      },
      data: { status: 'SKIPPED', error: 'late_due' },
    });

    const jobs = await this.prismaService.reminderJob.findMany({
      where: {
        type: { in: [...PLAN_REMINDER_TYPES] },
        status: { in: ['PENDING', 'SCHEDULED'] },
        due_at_utc: { lte: now, gte: graceStart },
      },
      select: PLAN_REMINDER_JOB_SELECT,
      orderBy: [{ due_at_utc: 'asc' }, { id: 'asc' }],
      take: 300,
    });
    if (!jobs.length) return;

    // push antes de whatsapp para o mesmo aviso (mesmo tipo/assinatura/ciclo)
    const groups = new Map<string, typeof jobs>();
    for (const job of jobs) {
      const key = `${job.type}|${job.customerPlanSubscriptionId}|${job.cycleId}`;
      groups.set(key, [...(groups.get(key) ?? []), job]);
    }

    for (const groupJobs of groups.values()) {
      await this.processGroup(groupJobs, now);
    }
  }

  private async processGroup(groupJobs: PlanReminderJob[], now: Date) {
    const base = groupJobs[0];
    const subscription = base.customerPlanSubscription;
    const skipGroup = (reason: string) =>
      Promise.all(groupJobs.map((job) => this.markSkipped(job.id, reason)));

    if (!subscription) return skipGroup('subscription_missing');
    if (subscription.status !== 'ACTIVE')
      return skipGroup('subscription_inactive');

    const cycle = subscription.cycles[0];
    if (!cycle || cycle.id !== base.cycleId) return skipGroup('cycle_changed');

    let message: { title: string; body: string };

    if (base.type === BusinessReminderType.PLAN_LAST_APPOINTMENT) {
      const appointment = base.appointment;
      if (!appointment) return skipGroup('appointment_missing');
      if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
        return skipGroup('appointment_status_invalid');
      }
      if (appointment.start_at_utc.getTime() <= now.getTime()) {
        return skipGroup('appointment_time_passed');
      }
      if (getAvailableCredits(cycle) !== 0) return skipGroup('no_longer_last');

      const last = await this.prismaService.appointmentPlanRedemption.findFirst(
        {
          where: {
            cycleId: cycle.id,
            status: 'RESERVED',
            appointment: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
          orderBy: { appointment: { start_at_utc: 'desc' } },
          select: { appointmentId: true },
        },
      );
      if (!last || last.appointmentId !== appointment.id) {
        return skipGroup('no_longer_last');
      }

      // Remarcação para mais longe: reagenda o aviso para a janela certa.
      const config =
        await this.prismaService.businessReminderSettings.findFirst({
          where: {
            businessId: base.businessId,
            type: BusinessReminderType.PLAN_LAST_APPOINTMENT,
          },
          select: { offsets_min_before: true },
        });
      const offsets = config?.offsets_min_before?.length
        ? config.offsets_min_before
        : BUSINESS_REMINDER_TYPE_DEFAULTS[
            BusinessReminderType.PLAN_LAST_APPOINTMENT
          ].offsets_min_before;
      const minutesToStart =
        (appointment.start_at_utc.getTime() - now.getTime()) / 60_000;
      if (minutesToStart > Math.max(...offsets) + OFFSET_TOLERANCE_MIN) {
        const newDue = new Date(
          appointment.start_at_utc.getTime() - Math.max(...offsets) * 60_000,
        );
        await Promise.all(
          groupJobs.map((job) =>
            this.prismaService.reminderJob.update({
              where: { id: job.id },
              data: { due_at_utc: newDue, status: 'PENDING' },
            }),
          ),
        );
        return;
      }

      const inTZ = tz(appointment.timezone || 'America/Sao_Paulo');
      const dayFormatted = format(appointment.start_at_utc, 'dd/MM', {
        in: inTZ,
      });
      const dayAndMonth =
        dayFormatted === format(now, 'dd/MM', { in: inTZ })
          ? 'hoje'
          : dayFormatted === format(addDays(now, 1), 'dd/MM', { in: inTZ })
            ? 'amanhã'
            : dayFormatted;
      message =
        NotificationMessageBuilder.buildPlanLastAppointmentMessageForCustomer({
          plan_name: subscription.plan.name,
          business_name: subscription.business.name,
          dayAndMonth,
          time: format(appointment.start_at_utc, 'HH:mm', { in: inTZ }),
        });
    } else {
      if (subscription.current_cycle_end.getTime() <= now.getTime()) {
        return skipGroup('cycle_ended');
      }
      const daysLeft = Math.ceil(
        (subscription.current_cycle_end.getTime() - now.getTime()) / 86_400_000,
      );
      message =
        NotificationMessageBuilder.buildPlanCycleEndingMessageForCustomer({
          plan_name: subscription.plan.name,
          business_name: subscription.business.name,
          daysLeft,
          creditsRemaining: getAvailableCredits(cycle),
        });
    }

    const pushJob = groupJobs.find((job) => job.channel === 'PUSH');
    const whatsappJob = groupJobs.find((job) => job.channel === 'WHATSAPP');
    const person = base.person;

    const sendPush = async (job: NonNullable<typeof pushJob>) => {
      const token = person.user?.push_token;
      if (!token) {
        await this.markSkipped(job.id, 'missing_push_token');
        return false;
      }
      try {
        await this.rmqService.publishToQueue({
          routingKey:
            MESSAGING_QUEUES.PUSH_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
          payload: new SendPushNotificationDto({
            pushTokens: [token],
            title: message.title,
            body: message.body,
          }),
        });
        await this.markSent(job.id);
        return true;
      } catch (err: any) {
        await this.markFailed(job.id, err?.message || 'push_send_error');
        return false;
      }
    };

    const sendWhatsApp = async (job: NonNullable<typeof whatsappJob>) => {
      if (!person.phone) {
        await this.markSkipped(job.id, 'missing_phone_number');
        return false;
      }
      try {
        await this.rmqService.publishToQueue({
          routingKey:
            MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS.SEND_TEXT_MESSAGE_QUEUE,
          payload: new SendWhatsAppTextMessageDto({
            phone_number: person.phone,
            message: message.body,
          }),
        });
        await this.markSent(job.id);
        return true;
      } catch (err: any) {
        await this.markFailed(job.id, err?.message || 'whatsapp_send_error');
        return false;
      }
    };

    if (pushJob && whatsappJob) {
      if (await sendPush(pushJob)) {
        // WhatsApp alguns minutos depois do push, como nos lembretes comuns
        await this.prismaService.reminderJob.update({
          where: { id: whatsappJob.id },
          data: {
            status: 'SCHEDULED',
            scheduled_at_utc: now,
            due_at_utc: new Date(now.getTime() + STAGGER_MS),
          },
        });
      } else {
        await sendWhatsApp(whatsappJob);
      }
    } else if (pushJob) {
      await sendPush(pushJob);
    } else if (whatsappJob) {
      await sendWhatsApp(whatsappJob);
    }
  }

  private markSent(jobId: string) {
    return this.prismaService.reminderJob.update({
      where: { id: jobId },
      data: {
        status: 'SENT',
        sent_at_utc: new Date(),
        error: null,
        attempts: { increment: 1 },
      },
    });
  }

  private markSkipped(jobId: string, reason: string) {
    return this.prismaService.reminderJob.update({
      where: { id: jobId },
      data: { status: 'SKIPPED', error: reason, attempts: { increment: 1 } },
    });
  }

  private markFailed(jobId: string, reason: string) {
    return this.prismaService.reminderJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: reason.slice(0, 200),
        attempts: { increment: 1 },
      },
    });
  }
}
