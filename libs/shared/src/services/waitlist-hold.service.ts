import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/database/database.service';

type Db = Pick<PrismaService, 'waitlistOffer'>;

/**
 * Uma oferta PENDING e não expirada da lista de espera "segura" o horário:
 * nenhum agendamento normal nem outra oferta pode ocupá-lo (mesmo tratamento
 * de Appointment e ProfessionalTimesBlock nas checagens de conflito).
 */
@Injectable()
export class WaitlistHoldService {
  constructor(private readonly prisma: PrismaService) {}

  /** Primeira oferta ativa que sobrepõe o intervalo, ignorando `ignoreOfferId`. */
  async findBlockingHold(
    params: {
      professionalProfileId: string;
      startUtc: Date;
      endUtc: Date;
      ignoreOfferId?: string | null;
      now?: Date;
    },
    db: Db = this.prisma,
  ) {
    const now = params.now ?? new Date();
    return db.waitlistOffer.findFirst({
      where: {
        professionalProfileId: params.professionalProfileId,
        status: 'PENDING',
        expires_at_utc: { gt: now },
        slot_start_at_utc: { lt: params.endUtc },
        slot_end_at_utc: { gt: params.startUtc },
        ...(params.ignoreOfferId ? { id: { not: params.ignoreOfferId } } : {}),
      },
      select: { id: true },
    });
  }

  /** Intervalos seguros no período, para descontar da disponibilidade. */
  async listHolds(
    params: {
      professionalProfileId: string;
      fromUtc: Date;
      toUtc: Date;
      now?: Date;
    },
    db: Db = this.prisma,
  ) {
    const now = params.now ?? new Date();
    return db.waitlistOffer.findMany({
      where: {
        professionalProfileId: params.professionalProfileId,
        status: 'PENDING',
        expires_at_utc: { gt: now },
        slot_start_at_utc: { lt: params.toUtc },
        slot_end_at_utc: { gt: params.fromUtc },
      },
      select: { slot_start_at_utc: true, slot_end_at_utc: true },
    });
  }
}
