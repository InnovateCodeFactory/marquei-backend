import { PrismaService } from '@app/shared';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SelectCurrentBusinessDto } from '../dto/requests/select-current-business.dto';

@Injectable()
export class SelectCurrentBusinessUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redis: RedisService,
  ) {}

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

    await Promise.all([
      this.prismaService.currentSelectedBusiness.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,
          businessId: isUserInBusiness.id,
        },
        update: {
          businessId: isUserInBusiness.id,
        },
      }),
      this.redis.clearCurrentUserFromRequest({
        userId: user.id,
      }),
    ]);

    return null;
  }
}
