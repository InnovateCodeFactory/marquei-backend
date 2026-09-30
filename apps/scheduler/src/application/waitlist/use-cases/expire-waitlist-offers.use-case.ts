import { PrismaService } from '@app/shared';
import { RedisLockService, WaitlistEventsService } from '@app/shared/services';
import { tz } from '@date-fns/tz';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { format } from 'date-fns';

const IN_TZ = tz('America/Sao_Paulo');
const BATCH = 200;

/**
 * Cron de 1 minuto (a janela de oferta é curta):
 * 1. Expira ofertas PENDING vencidas e passa a vaga para o próximo da fila.
 *    A entrada segue WAITING (perder o prazo não tira da fila).
 * 2. Marca como EXPIRED_DAY_PASSED as entradas de dias que já passaram.
 */
@Injectable()
export class ExpireWaitlistOffersUseCase {
  private readonly logger = new Logger(ExpireWaitlistOffersUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisLockService: RedisLockService,
    private readonly waitlistEventsService: WaitlistEventsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'America/Sao_Paulo' })
  async execute() {
    const lock = await this.redisLockService.tryAcquire({
      key: 'lock:waitlist-expire',
      ttlInSeconds: 55,
    });
    if (!lock) return;

    try {
      await this.expireOffers();
      await lock.renew(55).catch(() => void 0);
      await this.expireEntriesOfPastDays();
    } catch (error) {
      this.logger.error(
        `Erro ao expirar lista de espera (${(error as Error)?.message ?? 'erro'})`,
      );
    } finally {
      await lock.release();
    }
  }

  async expireOffers(now = new Date()) {
    const due = await this.prisma.waitlistOffer.findMany({
      where: { status: 'PENDING', expires_at_utc: { lte: now } },
      orderBy: { expires_at_utc: 'asc' },
      take: BATCH,
      select: {
        id: true,
        waitlistEntryId: true,
        businessId: true,
        professionalProfileId: true,
        slot_start_at_utc: true,
        slot_end_at_utc: true,
      },
    });

    let expired = 0;
    for (const offer of due) {
      // claim atômico: só quem virou PENDING -> EXPIRED publica (aceite concorrente vence)
      const claimed = await this.prisma.$transaction(async (tx) => {
        const res = await tx.waitlistOffer.updateMany({
          where: {
            id: offer.id,
            status: 'PENDING',
            expires_at_utc: { lte: now },
          },
          data: { status: 'EXPIRED', responded_at_utc: now },
        });
        if (res.count !== 1) return false;
        await tx.waitlistEvent.create({
          data: {
            waitlistEntryId: offer.waitlistEntryId,
            offerId: offer.id,
            event_type: 'OFFER_EXPIRED',
          },
        });
        return true;
      });
      if (!claimed) continue;
      expired += 1;

      if (offer.slot_start_at_utc.getTime() > now.getTime()) {
        await this.waitlistEventsService.publishSlotFreed({
          businessId: offer.businessId,
          professionalProfileId: offer.professionalProfileId,
          slotStartUtc: offer.slot_start_at_utc,
          slotEndUtc: offer.slot_end_at_utc,
          reason: 'OFFER_EXPIRED',
        });
      }
    }

    return expired;
  }

  async expireEntriesOfPastDays(now = new Date()) {
    const today = new Date(
      `${format(now, 'yyyy-MM-dd', { in: IN_TZ })}T00:00:00.000Z`,
    );

    const stale = await this.prisma.waitlistEntry.findMany({
      where: { status: 'WAITING', date: { lt: today } },
      take: 1000,
      select: { id: true },
    });
    if (!stale.length) return 0;

    const ids = stale.map((entry) => entry.id);
    await this.prisma.$transaction([
      this.prisma.waitlistEntry.updateMany({
        where: { id: { in: ids }, status: 'WAITING' },
        data: { status: 'EXPIRED_DAY_PASSED' },
      }),
      this.prisma.waitlistOffer.updateMany({
        where: { waitlistEntryId: { in: ids }, status: 'PENDING' },
        data: { status: 'EXPIRED', responded_at_utc: now },
      }),
      this.prisma.waitlistEvent.createMany({
        data: ids.map((id) => ({
          waitlistEntryId: id,
          event_type: 'REMOVED_DAY_PASSED' as const,
        })),
      }),
    ]);

    return ids.length;
  }
}
