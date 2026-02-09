import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class DeleteServiceComboUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(currentUser: CurrentUser, comboId: string) {
    const businessId = currentUser?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('Nenhum negócio selecionado');

    const combo = await this.prisma.serviceCombo.findFirst({
      where: {
        id: comboId,
        businessId,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (!combo) throw new NotFoundException('Combo não encontrado');

    const activeAppointmentsCount = await this.prisma.appointment.count({
      where: {
        serviceComboId: combo.id,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
    });

    if (activeAppointmentsCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir combo com agendamentos ativos',
      );
    }

    await this.prisma.serviceCombo.update({
      where: { id: combo.id },
      data: {
        is_active: false,
        deleted_at: new Date(),
        ...(currentUser.id
          ? { updated_by: { connect: { id: currentUser.id } } }
          : {}),
      },
    });

    return null;
  }
}
