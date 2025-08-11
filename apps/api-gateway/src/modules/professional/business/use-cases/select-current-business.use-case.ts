import { PrismaService } from '@app/shared';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SelectCurrentBusinessDto } from '../dto/requests/select-current-business.dto';

@Injectable()
export class SelectCurrentBusinessUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async execute(payload: SelectCurrentBusinessDto, user: CurrentUser) {
    const { current_selected_business_slug } = payload;
    const accountId = user.id; // id da AuthAccount

    const business = await this.prisma.business.findFirst({
      where: {
        slug: current_selected_business_slug,
        professionals: {
          some: {
            person: {
              personAccount: {
                authAccountId: accountId,
              },
            },
          },
        },
      },
      select: { id: true },
    });

    if (!business) throw new NotFoundException('Business not found');

    await Promise.all([
      this.prisma.currentSelectedBusiness.upsert({
        where: { accountId }, // UNIQUE
        create: {
          accountId,
          businessId: business.id,
        },
        update: {
          businessId: business.id,
        },
      }),
      // ajuste o método do Redis para aceitar accountId
      this.redis.clearCurrentUserFromRequest({
        accountId,
      }),
    ]);

    return null;
  }
}
