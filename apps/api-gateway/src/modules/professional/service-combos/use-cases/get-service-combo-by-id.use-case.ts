import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { presentServiceCombo } from '../utils/service-combo.presenter';

@Injectable()
export class GetServiceComboByIdUseCase {
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
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        is_active: true,
        pricing_mode: true,
        duration_mode: true,
        discount_percent: true,
        fixed_price_in_cents: true,
        custom_duration_minutes: true,
        base_price_in_cents: true,
        base_duration_minutes: true,
        final_price_in_cents: true,
        final_duration_minutes: true,
        created_at: true,
        updated_at: true,
        items: {
          orderBy: { sort_order: 'asc' },
          select: {
            sort_order: true,
            price_in_cents_snapshot: true,
            duration_minutes_snapshot: true,
            service: {
              select: {
                id: true,
                name: true,
                is_active: true,
              },
            },
          },
        },
        professionals: {
          select: {
            professional_profile_id: true,
            professional_profile: {
              select: {
                User: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!combo) throw new NotFoundException('Combo não encontrado');

    return presentServiceCombo(combo);
  }
}
