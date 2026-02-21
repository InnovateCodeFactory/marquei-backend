import { PrismaService } from '@app/shared';
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class InnovateConnectToggleAppUpdateModalUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id, isActive }: { id: string; isActive: boolean }) {
    const modal = await this.prisma.appUpdateModal.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!modal) {
      throw new NotFoundException('App update modal não encontrado');
    }

    const updated = await this.prisma.appUpdateModal.update({
      where: { id },
      data: { is_active: isActive },
      select: {
        id: true,
        is_active: true,
        updated_at: true,
      },
    });

    return updated;
  }
}

