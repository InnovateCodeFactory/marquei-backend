import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SelectCurrentBusinessDto } from '../dto/requests/select-current-business.dto';

@Injectable()
export class SelectCurrentBusinessUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: SelectCurrentBusinessDto, user: CurrentUser) {
    const { current_selected_business_slug } = payload;

    const isUserInBusiness = await this.prismaService.business.findFirst({
      where: {
        slug: current_selected_business_slug,
        professionals: {
          some: {
            userId: user.id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!isUserInBusiness) throw new NotFoundException('Business not found');

    await this.prismaService.user.update({
      where: {
        id: user.id,
      },
      data: {
        current_selected_business_slug,
      },
    });

    return null;
  }
}
