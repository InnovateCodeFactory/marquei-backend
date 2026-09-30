import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { presentOffer } from './waitlist-presenter';

@Injectable()
export class GetWaitlistOfferUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /** Detalhe da oferta (tela aberta pelo push). Só o dono da entrada enxerga. */
  async execute(offerId: string, req: AppRequest) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Usuário não autenticado.');

    const offer = await this.prisma.waitlistOffer.findFirst({
      where: { id: offerId, waitlistEntry: { personId } },
      select: {
        id: true,
        status: true,
        slot_start_at_utc: true,
        slot_end_at_utc: true,
        expires_at_utc: true,
        business: { select: { slug: true, name: true } },
        professional: { select: { User: { select: { name: true } } } },
        service: { select: { name: true } },
        serviceCombo: { select: { name: true } },
      },
    });
    if (!offer) throw new NotFoundException('Oferta não encontrada.');

    const now = new Date();
    const expired = offer.status === 'PENDING' && offer.expires_at_utc <= now;

    return {
      ...presentOffer(offer, now),
      status: expired ? 'EXPIRED' : offer.status,
      business: offer.business,
    };
  }
}
