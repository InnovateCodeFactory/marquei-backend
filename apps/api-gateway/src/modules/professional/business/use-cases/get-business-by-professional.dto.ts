import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { getInitials } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetBusinessByProfessionalUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(currentUser: CurrentUser) {
    const { id, current_selected_business_id } = currentUser;

    const business = await this.prismaService.business.findMany({
      where: {
        professionals: {
          some: {
            userId: id,
          },
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        logo: true,
        is_active: true,
      },
    });

    return business?.map((business) => ({
      ...business,
      initials: getInitials(business.name),
      logo: this.fs.getPublicUrl({
        key: business.logo,
      }),
      is_the_current_selected: business.id === current_selected_business_id,
      is_active: business.is_active,
    }));
  }
}
