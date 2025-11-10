import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Price } from '@app/shared/value-objects';
import { BadRequestException, Injectable } from '@nestjs/common';
import { GetServicesDto } from '../dto/requests/get-services.dto';

@Injectable()
export class GetServicesUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(currentUser: CurrentUser, query: GetServicesDto) {
    if (!currentUser?.current_selected_business_slug)
      throw new BadRequestException('Nenhum negócio selecionado');

    const { current_selected_business_slug } = currentUser;
    const { limit, page, search } = query;

    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 25;
    const skip = (pageNumber - 1) * pageSize;

    const whereClause: any = {
      is_active: true,
      business: {
        slug: current_selected_business_slug,
      },
    };

    if (search?.trim()) {
      const terms = search.trim().split(/\s+/);

      // aplica AND com contains para todas as palavras
      whereClause.AND = terms.map((term) => ({
        name: {
          contains: term,
          mode: 'insensitive',
        },
      }));
    }

    const [services, totalCount] = await Promise.all([
      this.prismaService.service.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          duration: true,
          price_in_cents: true,
          color: true,
          professionals: {
            select: {
              professional_profile_id: true,
              professional_profile: {
                select: {
                  User: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        skip,
        take: pageSize,
      }),
      this.prismaService.service.count({
        where: whereClause,
      }),
    ]);

    const servicesFormatted = services.map((service) => {
      const durationHours = Math.floor(service.duration / 60);
      const durationMinutes = service.duration % 60;

      const durationFormatted =
        durationHours > 0
          ? `${durationHours}h ${durationMinutes}m`
          : `${durationMinutes}m`;

      const professionalsId = service.professionals.map((p) => {
        return {
          id: p.professional_profile_id,
          name: p.professional_profile.User.name,
        };
      });

      return {
        ...service,
        price: new Price(service.price_in_cents).toCurrency(),
        durationFormatted,
        professionalsId,
      };
    });

    const hasMorePages = totalCount > skip + pageSize;

    const obj = {
      services: servicesFormatted,
      totalCount,
      page: pageNumber,
      limit: pageSize,
      hasMorePages,
      totalPages: Math.ceil(totalCount / pageSize),
    };
    return obj;
  }
}
