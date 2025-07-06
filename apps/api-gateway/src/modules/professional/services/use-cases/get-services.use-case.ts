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

    const services = await this.prismaService.service.findMany({
      where: {
        business: {
          slug: current_selected_business_slug,
        },
      },
      select: {
        id: true,
        name: true,
        duration: true,
        price_in_cents: true,
      },
      take: query.limit ? parseInt(query.limit) : undefined,
      skip: query.page
        ? (parseInt(query.page) - 1) *
          (query.limit ? parseInt(query.limit) : 10)
        : undefined,
    });

    return services.map((service) => {
      const durationHours = Math.floor(service.duration / 60);
      const durationMinutes = service.duration % 60;

      const durationFormatted =
        durationHours > 0
          ? `${durationHours}h ${durationMinutes}m`
          : `${durationMinutes}m`;

      return {
        ...service,
        price: new Price(service.price_in_cents).toCurrency(),
        durationFormatted,
      };
    });
  }
}
