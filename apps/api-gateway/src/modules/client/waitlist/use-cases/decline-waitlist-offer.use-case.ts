import { PrismaService } from '@app/shared';
import { WaitlistEventsService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class DeclineWaitlistOfferUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly waitlistEventsService: WaitlistEventsService,
  ) {}

  async execute(offerId: string, req: AppRequest) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Usuário não autenticado.');

    const offer = await this.prisma.waitlistOffer.findFirst({
      where: { id: offerId, waitlistEntry: { personId } },
      select: {
        id: true,
        waitlistEntryId: true,
        businessId: true,
        professionalProfileId: true,
        slot_start_at_utc: true,
        slot_end_at_utc: true,
      },
    });
    if (!offer) throw new NotFoundException('Oferta não encontrada.');

    const now = new Date();
    const declined = await this.prisma.$transaction(async (tx) => {
      const res = await tx.waitlistOffer.updateMany({
        where: { id: offer.id, status: 'PENDING' },
        data: { status: 'DECLINED', responded_at_utc: now },
      });
      if (res.count !== 1) return false;
      await tx.waitlistEvent.create({
        data: {
          waitlistEntryId: offer.waitlistEntryId,
          offerId: offer.id,
          event_type: 'OFFER_DECLINED',
          by_user_id: req.user.id,
        },
      });
      return true;
    });
    if (!declined) {
      throw new BadRequestException(
        'Essa oferta já foi respondida ou expirou.',
      );
    }

    // A entrada segue WAITING; a vaga passa imediatamente para o próximo, sem esperar o prazo.
    if (offer.slot_start_at_utc.getTime() > now.getTime()) {
      await this.waitlistEventsService.publishSlotFreed({
        businessId: offer.businessId,
        professionalProfileId: offer.professionalProfileId,
        slotStartUtc: offer.slot_start_at_utc,
        slotEndUtc: offer.slot_end_at_utc,
        excludedPersonId: personId,
        reason: 'OFFER_DECLINED',
      });
    }

    return null;
  }
}
