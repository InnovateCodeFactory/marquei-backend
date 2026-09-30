import { PrismaService } from '@app/shared';
import { WaitlistSlotFreedDto } from '@app/shared/dto/messaging/waitlist';
import { SendPushNotificationDto } from '@app/shared/dto/messaging/push-notifications';
import { SendWhatsAppTextMessageDto } from '@app/shared/dto/messaging/whatsapp-notifications';
import {
  MESSAGING_QUEUES,
  RABBIT_DLX_EXCHANGE,
  SCHEDULER_QUEUES,
} from '@app/shared/modules/rmq/constants';
import {
  RABBIT_EXCHANGE,
  RmqService,
} from '@app/shared/modules/rmq/rmq.service';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { RedisLockService, WaitlistHoldService } from '@app/shared/services';
import { NotificationMessageBuilder } from '@app/shared/utils/notification-message-builder';
import { tz } from '@date-fns/tz';
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { addDays, format } from 'date-fns';

const BUSINESS_TZ_ID = 'America/Sao_Paulo';
const IN_TZ = tz(BUSINESS_TZ_ID);
const MIN_LEAD_MS = 2 * 60_000; // não oferece vaga que começa em menos de 2 min
const MAX_CANDIDATES = 50;
const MAX_DELIVERY_ATTEMPTS = 5;

export type OfferNextResult =
  | { outcome: 'OFFERED'; offerId: string }
  | {
      outcome:
        | 'NO_ELIGIBLE'
        | 'SLOT_TAKEN'
        | 'TOO_LATE'
        | 'WAITLIST_DISABLED'
        | 'LOCKED';
    };

/**
 * Oferta sequencial da lista de espera: quando um horário abre, oferece ao
 * primeiro da fila compatível (por `queued_at`), com prazo curto para aceitar.
 * Quem perde o prazo continua na fila (só perde aquela vaga específica).
 */
@Injectable()
export class OfferNextWaitlistEntryUseCase {
  private readonly logger = new Logger(OfferNextWaitlistEntryUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rmqService: RmqService,
    private readonly redisLockService: RedisLockService,
    private readonly redisService: RedisService,
    private readonly waitlistHoldService: WaitlistHoldService,
  ) {}

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    routingKey: SCHEDULER_QUEUES.WAITLIST.SLOT_FREED_QUEUE,
    queue: SCHEDULER_QUEUES.WAITLIST.SLOT_FREED_QUEUE,
    queueOptions: {
      durable: true,
      deadLetterExchange: RABBIT_DLX_EXCHANGE,
      deadLetterRoutingKey: SCHEDULER_QUEUES.WAITLIST.SLOT_FREED_DLQ,
    },
  })
  async handleSlotFreed(message: WaitlistSlotFreedDto) {
    // non_retryable: payload inválido vai direto pra DLQ
    if (!this.isValidMessage(message)) {
      this.logger.warn('waitlist.slot_freed: payload inválido, enviando à DLQ');
      return new Nack(false);
    }

    const doneKey = `waitlist:slot-freed:done:${message.message_id}`;
    if (await this.redisService.exists({ key: doneKey })) return; // idempotência

    const attemptsKey = `waitlist:slot-freed:attempts:${message.message_id}`;

    try {
      const result = await this.offerNext({
        businessId: message.business_id,
        professionalProfileId: message.professional_profile_id,
        slotStartUtc: new Date(message.slot_start_at_utc),
        slotEndUtc: new Date(message.slot_end_at_utc),
        excludedPersonId: message.excluded_person_id ?? null,
        reason: message.reason,
      });

      // lock ocupado: tenta de novo (com teto de tentativas)
      if (result.outcome === 'LOCKED')
        return this.retryOrDeadLetter(attemptsKey);

      await this.redisService.set({
        key: doneKey,
        value: '1',
        ttlInSeconds: 86_400,
      });
      await this.redisService.del({ key: attemptsKey });
    } catch (error) {
      this.logger.error(
        `waitlist.slot_freed: falha técnica (${(error as Error)?.message ?? 'erro'})`,
      );
      return this.retryOrDeadLetter(attemptsKey);
    }
  }

  async offerNext(params: {
    businessId: string;
    professionalProfileId: string;
    slotStartUtc: Date;
    slotEndUtc: Date;
    excludedPersonId?: string | null;
    reason?: string;
  }): Promise<OfferNextResult> {
    const { businessId, professionalProfileId, slotStartUtc, slotEndUtc } =
      params;
    const slotDate = format(slotStartUtc, 'yyyy-MM-dd', { in: IN_TZ });

    const handled = await this.redisLockService.withLock(
      {
        key: `lock:waitlist:${businessId}:${professionalProfileId}:${slotDate}`,
        ttlInSeconds: 30,
        maxWaitMs: 5_000,
      },
      () => this.offerNextLocked({ ...params, slotDate }),
    );

    return handled ?? { outcome: 'LOCKED' };
  }

  private async offerNextLocked(params: {
    businessId: string;
    professionalProfileId: string;
    slotStartUtc: Date;
    slotEndUtc: Date;
    excludedPersonId?: string | null;
    reason?: string;
    slotDate: string;
  }): Promise<OfferNextResult> {
    const { businessId, professionalProfileId, slotStartUtc, slotEndUtc } =
      params;
    const now = new Date();

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        name: true,
        is_active: true,
        is_waitlist_enabled: true,
        waitlist_offer_ttl_minutes: true,
      },
    });
    if (!business?.is_active || !business.is_waitlist_enabled) {
      return { outcome: 'WAITLIST_DISABLED' };
    }

    if (slotStartUtc.getTime() - now.getTime() < MIN_LEAD_MS) {
      return { outcome: 'TOO_LATE' };
    }

    if (
      !(await this.isSlotFree({
        businessId,
        professionalProfileId,
        slotStartUtc,
        slotEndUtc,
        now,
      }))
    ) {
      return { outcome: 'SLOT_TAKEN' };
    }

    const slotMinutes = Math.round(
      (slotEndUtc.getTime() - slotStartUtc.getTime()) / 60_000,
    );
    const date = new Date(`${params.slotDate}T00:00:00.000Z`);

    const candidates = await this.prisma.waitlistEntry.findMany({
      where: {
        businessId,
        date,
        status: 'WAITING',
        ...(params.excludedPersonId
          ? { personId: { not: params.excludedPersonId } }
          : {}),
        // sem outra oferta ativa agora (uma vaga por vez por pessoa)
        NOT: [
          {
            offers: {
              some: { status: 'PENDING', expires_at_utc: { gt: now } },
            },
          },
          // e quem já teve esta vaga específica (recusou/expirou) não recebe de novo
          {
            offers: {
              some: {
                professionalProfileId,
                slot_start_at_utc: slotStartUtc,
                slot_end_at_utc: slotEndUtc,
              },
            },
          },
        ],
        OR: [{ professionalProfileId }, { professionalProfileId: null }],
      },
      orderBy: [{ queued_at: 'asc' }, { id: 'asc' }],
      take: MAX_CANDIDATES,
      select: {
        id: true,
        personId: true,
        serviceId: true,
        serviceComboId: true,
        service: { select: { name: true, duration: true } },
        serviceCombo: { select: { name: true, final_duration_minutes: true } },
        person: {
          select: { phone: true, user: { select: { push_token: true } } },
        },
      },
    });

    for (const entry of candidates) {
      const duration =
        entry.service?.duration ??
        entry.serviceCombo?.final_duration_minutes ??
        0;
      if (duration <= 0 || duration > slotMinutes) continue;

      // fila "qualquer profissional": só vale se o profissional da vaga executa o serviço
      const executes = entry.serviceId
        ? await this.prisma.professionalService.count({
            where: {
              professional_profile_id: professionalProfileId,
              service_id: entry.serviceId,
              active: true,
            },
          })
        : await this.prisma.professionalServiceCombo.count({
            where: {
              professional_profile_id: professionalProfileId,
              service_combo_id: entry.serviceComboId!,
              active: true,
            },
          });
      if (executes < 1) continue;

      const ttlMs = Math.max(1, business.waitlist_offer_ttl_minutes) * 60_000;
      const expiresAt = new Date(
        Math.min(now.getTime() + ttlMs, slotStartUtc.getTime() - 60_000),
      );
      const minutes = Math.max(
        1,
        Math.round((expiresAt.getTime() - now.getTime()) / 60_000),
      );

      const offer = await this.prisma.$transaction(async (tx) => {
        const created = await tx.waitlistOffer.create({
          data: {
            waitlistEntryId: entry.id,
            businessId,
            professionalProfileId,
            serviceId: entry.serviceId,
            serviceComboId: entry.serviceComboId,
            slot_start_at_utc: slotStartUtc,
            slot_end_at_utc: slotEndUtc,
            expires_at_utc: expiresAt,
            metadata: params.reason ? { reason: params.reason } : undefined,
          },
          select: { id: true },
        });
        await tx.waitlistEvent.create({
          data: {
            waitlistEntryId: entry.id,
            offerId: created.id,
            event_type: 'OFFER_SENT',
            reason: params.reason ?? null,
          },
        });
        return created;
      });

      await this.notify({
        offerId: offer.id,
        businessName: business.name,
        serviceName:
          entry.service?.name ?? entry.serviceCombo?.name ?? 'atendimento',
        slotStartUtc,
        minutes,
        pushToken: entry.person.user?.push_token ?? null,
        phone: entry.person.phone ?? null,
        now,
      });

      return { outcome: 'OFFERED', offerId: offer.id };
    }

    return { outcome: 'NO_ELIGIBLE' };
  }

  private async isSlotFree(params: {
    businessId: string;
    professionalProfileId: string;
    slotStartUtc: Date;
    slotEndUtc: Date;
    now: Date;
  }) {
    const { businessId, professionalProfileId, slotStartUtc, slotEndUtc } =
      params;

    const [appointment, block, hold] = await Promise.all([
      this.prisma.appointment.findFirst({
        where: {
          professionalProfileId,
          start_at_utc: { lt: slotEndUtc },
          end_at_utc: { gt: slotStartUtc },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        select: { id: true },
      }),
      this.prisma.professionalTimesBlock.findFirst({
        where: {
          businessId,
          professionalProfileId,
          start_at_utc: { lt: slotEndUtc },
          end_at_utc: { gt: slotStartUtc },
        },
        select: { id: true },
      }),
      this.waitlistHoldService.findBlockingHold({
        professionalProfileId,
        startUtc: slotStartUtc,
        endUtc: slotEndUtc,
        now: params.now,
      }),
    ]);

    return !appointment && !block && !hold;
  }

  private async notify(params: {
    offerId: string;
    businessName: string;
    serviceName: string;
    slotStartUtc: Date;
    minutes: number;
    pushToken: string | null;
    phone: string | null;
    now: Date;
  }) {
    const dayFormatted = format(params.slotStartUtc, 'dd/MM', { in: IN_TZ });
    const dayAndMonth =
      dayFormatted === format(params.now, 'dd/MM', { in: IN_TZ })
        ? 'hoje'
        : dayFormatted ===
            format(addDays(params.now, 1), 'dd/MM', { in: IN_TZ })
          ? 'amanhã'
          : dayFormatted;

    const message =
      NotificationMessageBuilder.buildWaitlistSlotOfferedMessageForCustomer({
        business_name: params.businessName,
        service_name: params.serviceName,
        dayAndMonth,
        time: format(params.slotStartUtc, 'HH:mm', { in: IN_TZ }),
        minutes: params.minutes,
      });

    const tasks: Promise<void>[] = [];
    if (params.pushToken) {
      tasks.push(
        this.rmqService.publishToQueue({
          routingKey:
            MESSAGING_QUEUES.PUSH_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
          payload: new SendPushNotificationDto({
            pushTokens: [params.pushToken],
            title: message.title,
            body: message.body,
            // deep link: o client-app abre direto a tela de aceitar/recusar
            data: { type: 'WAITLIST_SLOT_OFFERED', offer_id: params.offerId },
          }),
        }),
      );
    }
    if (params.phone) {
      tasks.push(
        this.rmqService.publishToQueue({
          routingKey:
            MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS.SEND_TEXT_MESSAGE_QUEUE,
          payload: new SendWhatsAppTextMessageDto({
            phone_number: params.phone,
            message: message.body,
          }),
        }),
      );
    }
    await Promise.all(tasks);

    await this.prisma.waitlistOffer.update({
      where: { id: params.offerId },
      data: { notified_at_utc: new Date() },
    });
  }

  private async retryOrDeadLetter(attemptsKey: string) {
    const previous = Number(
      (await this.redisService.get({ key: attemptsKey })) ?? 0,
    );
    const attempts = previous + 1;
    if (attempts >= MAX_DELIVERY_ATTEMPTS) {
      await this.redisService.del({ key: attemptsKey });
      return new Nack(false); // teto atingido: DLQ, nunca fica pendente pra sempre
    }
    await this.redisService.set({
      key: attemptsKey,
      value: String(attempts),
      ttlInSeconds: 3_600,
    });
    return new Nack(true);
  }

  private isValidMessage(
    message: Partial<WaitlistSlotFreedDto> | null | undefined,
  ) {
    if (!message) return false;
    const { message_id, business_id, professional_profile_id } = message;
    const start = new Date(message.slot_start_at_utc ?? '');
    const end = new Date(message.slot_end_at_utc ?? '');
    return Boolean(
      message_id &&
      business_id &&
      professional_profile_id &&
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      end > start,
    );
  }
}
