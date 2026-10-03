import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAppointmentUseCase } from '../../customer-appointments/use-cases';

@Injectable()
export class AcceptWaitlistOfferUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createAppointment: CreateAppointmentUseCase,
  ) {}

  async execute(offerId: string, req: AppRequest) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Usuário não autenticado.');

    const offer = await this.prisma.waitlistOffer.findFirst({
      where: { id: offerId, waitlistEntry: { personId } },
      select: {
        id: true,
        waitlistEntryId: true,
        professionalProfileId: true,
        serviceId: true,
        serviceComboId: true,
        slot_start_at_utc: true,
      },
    });
    if (!offer) throw new NotFoundException('Oferta não encontrada.');

    // Claim atômico: revalida status e prazo no servidor (o contador do app é só visual).
    // Só um aceite concorrente vence; expirada/recusada/de outro cliente nunca cria agendamento.
    const now = new Date();
    const claimed = await this.prisma.waitlistOffer.updateMany({
      where: { id: offer.id, status: 'PENDING', expires_at_utc: { gt: now } },
      data: { status: 'CONVERTED', responded_at_utc: now },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException(
        'Essa vaga não está mais disponível. O prazo acabou ou ela já foi respondida.',
      );
    }

    let appointmentId: string;
    try {
      const created = await this.createAppointment.createAndReturnId(
        {
          appointment_date: offer.slot_start_at_utc.toISOString(),
          professional_id: offer.professionalProfileId,
          service_id: offer.serviceId ?? undefined,
          combo_id: offer.serviceComboId ?? undefined,
        },
        req,
        { ignoreWaitlistOfferId: offer.id },
      );
      appointmentId = created.appointmentId;
    } catch (error) {
      // Não conseguiu agendar: devolve a oferta (o cron expira e passa a vez).
      await this.prisma.waitlistOffer.updateMany({
        where: { id: offer.id, status: 'CONVERTED' },
        data: { status: 'PENDING', responded_at_utc: null },
      });
      throw error;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.waitlistEntry.update({
        where: { id: offer.waitlistEntryId },
        data: { status: 'CONVERTED', converted_appointment_id: appointmentId },
      });
      await tx.waitlistEvent.create({
        data: {
          waitlistEntryId: offer.waitlistEntryId,
          offerId: offer.id,
          event_type: 'CONVERTED',
          by_user_id: req.user.id,
        },
      });
    });

    return { appointment_id: appointmentId };
  }
}
