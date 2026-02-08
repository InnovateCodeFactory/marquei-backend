import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

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
      select: {
        id: true,
        businessId: true,
        professionalProfileId: true,
        is_all_day: true,
        start_at_utc: true,
        end_at_utc: true,
      },
    });

    if (!block) {
      throw new NotFoundException('Bloqueio não encontrado');
    }

    if (block.businessId !== user.current_selected_business_id)
      throw new UnauthorizedException('User not authorized');

    if (!block.is_all_day) {
      await this.prisma.professionalTimesBlock.delete({ where: { id } });
      return null;
    }

    const allDayBlocks = await this.prisma.professionalTimesBlock.findMany({
      where: {
        businessId: block.businessId,
        professionalProfileId: block.professionalProfileId,
        is_all_day: true,
      },
      orderBy: { start_at_utc: 'asc' },
      select: {
        id: true,
        start_at_utc: true,
        end_at_utc: true,
      },
    });

    const currentIndex = allDayBlocks.findIndex((it) => it.id === block.id);
    if (currentIndex === -1) {
      throw new NotFoundException('Bloqueio não encontrado');
    }

    let first = currentIndex;
    while (
      first > 0 &&
      allDayBlocks[first - 1].end_at_utc.getTime() ===
        allDayBlocks[first].start_at_utc.getTime()
    ) {
      first -= 1;
    }

    let last = currentIndex;
    while (
      last < allDayBlocks.length - 1 &&
      allDayBlocks[last].end_at_utc.getTime() ===
        allDayBlocks[last + 1].start_at_utc.getTime()
    ) {
      last += 1;
    }

    const idsToDelete = allDayBlocks.slice(first, last + 1).map((it) => it.id);

    await this.prisma.professionalTimesBlock.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    return null;
  }
}
