import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { getInitials } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetBusinessByProfessionalUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(currentUser: CurrentUser) {
    const { id } = currentUser;

    const business = await this.prismaService.business.findMany({
      where: {
        professionals: {
          some: {
            userId: id,
          },
        },
        is_active: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        logo: true,
      },
    });

    return business?.map((business) => ({
      ...business,
      initials: getInitials(business.name),
    }));
  }
}
