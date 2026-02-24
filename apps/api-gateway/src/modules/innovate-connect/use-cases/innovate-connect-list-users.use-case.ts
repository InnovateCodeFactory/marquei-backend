import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InnovateConnectPaginationDto } from '../dto/requests/innovate-connect-pagination.dto';

@Injectable()
export class InnovateConnectListUsersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ page = 1, perPage = 20 }: InnovateConnectPaginationDto) {
    const take = Math.min(perPage, 100);
    const skip = (page - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          user_type: true,
          push_token: true,
          person: {
            select: {
              phone: true,
            },
          },
          professional_profile: {
            where: {
              status: 'ACTIVE',
            },
            select: {
              phone: true,
              status: true,
            },
          },
          CurrentSelectedBusiness: {
            take: 1,
            select: {
              business: {
                select: {
                  id: true,
                  name: true,
                  is_active: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    const normalizedItems = items.map(
      ({ push_token, professional_profile, CurrentSelectedBusiness, ...user }) => {
        const isProfessional = user.user_type === 'PROFESSIONAL';
        return {
          ...user,
          is_active: isProfessional ? professional_profile.length > 0 : true,
          selected_business:
            isProfessional && CurrentSelectedBusiness?.[0]?.business
              ? {
                  id: CurrentSelectedBusiness[0].business.id,
                  name: CurrentSelectedBusiness[0].business.name,
                  is_active: CurrentSelectedBusiness[0].business.is_active,
                }
              : null,
          professional_profile,
          has_push_token: Boolean(push_token),
        };
      },
    );

    return {
      items: normalizedItems,
      meta: {
        page,
        perPage: take,
        total,
      },
    };
  }
}
