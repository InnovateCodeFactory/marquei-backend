import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DeleteServiceDto } from '../dto/requests/delete-service.dto';

@Injectable()
export class DeleteServiceUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(query: DeleteServiceDto, user: CurrentUser) {
    const { current_selected_business_slug } = user;

    const [service, isTheBusinessOwner] = await Promise.all([
      this.prismaService.service.findFirst({
        where: {
          id: query.id,
          business: {
            slug: current_selected_business_slug,
          },
        },
        select: {
          id: true,
          businessId: true,
        },
      }),
      this.prismaService.business.findFirst({
        where: {
          slug: current_selected_business_slug,
          ownerId: user.id,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!service) throw new NotFoundException('Service not found');
    if (!service.businessId) throw new NotFoundException('Business not found');

    if (!isTheBusinessOwner)
      throw new UnauthorizedException('Ação não permitida');

    await this.prismaService.service.delete({
      where: {
        id: service.id,
      },
    });

    return null;
  }
}
