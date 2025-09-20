import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class GetFavoriteKeysUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(req: AppRequest) {
    const personId = req.user?.personId;
    if (!personId)
      throw new BadRequestException(
        'Perfil de cliente não encontrado para este usuário.',
      );

    const rows = await this.prisma.favorite.findMany({
      where: { personId },
      select: { business: { select: { id: true, slug: true } } },
      orderBy: { created_at: 'desc' },
    });

    return rows
      .map((r) => r.business)
      .filter((b): b is { id: string; slug: string } => !!b);
  }
}
