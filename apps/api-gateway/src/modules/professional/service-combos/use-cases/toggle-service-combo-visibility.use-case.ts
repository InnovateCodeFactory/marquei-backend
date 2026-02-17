import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class ToggleServiceComboVisibilityUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    currentUser: CurrentUser,
    comboId: string,
    payload: { is_active: boolean },
  ) {
    const businessId = currentUser?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('Nenhum negócio selecionado');

    const combo = await this.prisma.serviceCombo.findFirst({
      where: {
        id: comboId,
        businessId,
        deleted_at: null,
      },
      select: { id: true, is_active: true },
    });

    if (!combo) throw new NotFoundException('Combo não encontrado');

    if (combo.is_active === payload.is_active) {
      return {
        id: combo.id,
        is_active: combo.is_active,
      };
    }

    if (payload.is_active) {
      const [activeServicesCount, activeProfessionalsCount] =
        await Promise.all([
          this.prisma.serviceComboItem.count({
            where: {
              comboId: combo.id,
              service: { is_active: true },
            },
          }),
          this.prisma.professionalServiceCombo.count({
            where: {
              service_combo_id: combo.id,
              active: true,
              professional_profile: {
                status: 'ACTIVE',
              },
            },
          }),
        ]);

      if (activeServicesCount < 2) {
        throw new BadRequestException(
          'Não é possível ativar combo sem ao menos 2 serviços ativos',
        );
      }

      if (activeProfessionalsCount < 1) {
        throw new BadRequestException(
          'Não é possível ativar combo sem ao menos 1 profissional ativo',
        );
      }
    }

    const updated = await this.prisma.serviceCombo.update({
      where: { id: combo.id },
      data: {
        is_active: payload.is_active,
        updated_by:
          currentUser?.id && currentUser.id !== ''
            ? { connect: { id: currentUser.id } }
            : undefined,
      },
      select: {
        id: true,
        is_active: true,
      },
    });

    return updated;
  }
}
