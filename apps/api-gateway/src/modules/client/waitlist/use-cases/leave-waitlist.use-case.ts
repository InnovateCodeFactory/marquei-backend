import { PrismaService } from '@app/shared';
import { WaitlistEventsService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class LeaveWaitlistUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly waitlistEventsService: WaitlistEventsService,
  ) {}

  async execute(entryId: string, req: AppRequest) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Usuário não autenticado.');

    // só o dono da entrada pode sair
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { id: entryId, personId },
      select: { id: true, status: true },
    });
    if (!entry)
      throw new NotFoundException('Entrada na lista de espera não encontrada.');
    if (entry.status !== 'WAITING') return null;

    const now = new Date();
    const superseded = await this.prisma.$transaction(async (tx) => {
      const res = await tx.waitlistEntry.updateMany({
        where: { id: entry.id, status: 'WAITING' },
        data: { status: 'CANCELED' },
      });
      if (res.count !== 1) return [];

      await tx.waitlistEvent.create({
        data: {
          waitlistEntryId: entry.id,
          event_type: 'LEFT',
          by_user_id: req.user.id,
        },
      });

      // oferta pendente vira SUPERSEDED e a vez passa na hora
      const pending = await tx.waitlistOffer.findMany({
        where: { waitlistEntryId: entry.id, status: 'PENDING' },
        select: {
          id: true,
          businessId: true,
          professionalProfileId: true,
          slot_start_at_utc: true,
          slot_end_at_utc: true,
        },
      });
      if (pending.length) {
        await tx.waitlistOffer.updateMany({
          where: { id: { in: pending.map((o) => o.id) }, status: 'PENDING' },
          data: { status: 'SUPERSEDED', responded_at_utc: now },
        });
      }
      return pending;
    });

    for (const offer of superseded) {
      if (offer.slot_start_at_utc.getTime() <= now.getTime()) continue;
      await this.waitlistEventsService.publishSlotFreed({
        businessId: offer.businessId,
        professionalProfileId: offer.professionalProfileId,
        slotStartUtc: offer.slot_start_at_utc,
        slotEndUtc: offer.slot_end_at_utc,
        excludedPersonId: personId,
        reason: 'OFFER_SUPERSEDED',
      });
    }

    return null;
  }
}
