import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class DeleteBlockedTimeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, req: AppRequest) {
    const { user } = req;
    if (!user?.current_selected_business_id) {
      throw new UnauthorizedException('User not authorized');
    }
    const business = await this.prisma.business.findUnique({
      where: { id: user.current_selected_business_id },
      select: { id: true },
    });
    if (!business) {
      throw new UnauthorizedException('User not authorized');
    }
    const block = await this.prisma.professionalTimesBlock.findUnique({
      where: { id },
      select: { id: true, businessId: true },
    });

    if (block.businessId !== user.current_selected_business_id)
      throw new UnauthorizedException('User not authorized');

    await this.prisma.professionalTimesBlock.delete({ where: { id } });
    return null;
  }
}
