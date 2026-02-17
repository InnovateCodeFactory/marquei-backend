import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { BadRequestException, Injectable } from '@nestjs/common';
import { GetServiceCombosDto } from '../dto/requests';
import { presentServiceCombo } from '../utils/service-combo.presenter';

@Injectable()
export class GetServiceCombosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(currentUser: CurrentUser, query: GetServiceCombosDto) {
    const businessId = currentUser?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('Nenhum negócio selecionado');

    const page = Math.max(Number(query.page || '1') || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit || '10') || 10, 1), 100);
    const search = query.search?.trim();
    const isActive =
      query.is_active === undefined ? undefined : query.is_active === 'true';

    const where = {
      businessId,
      deleted_at: null as Date | null,
      ...(typeof isActive === 'boolean' ? { is_active: isActive } : {}),
      ...(search
        ? {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.serviceCombo.count({ where }),
      this.prisma.serviceCombo.findMany({
        where,
        orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
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
      }),
    ]);

    return {
      page,
      limit,
      total,
      total_pages: Math.max(Math.ceil(total / limit), 1),
      combos: rows.map((combo) => presentServiceCombo(combo)),
    };
  }
}
