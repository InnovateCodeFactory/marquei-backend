import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class GetProfilePresentationUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(user: CurrentUser) {
    if (!user?.current_selected_business_id)
      throw new ForbiddenException(
        'Não foi possível encontrar o negócio selecionado',
      );

    return await this.prismaService.business.findUnique({
      where: {
        id: user.current_selected_business_id,
      },
      select: {
        name: true,
        // TODO: mudar pra cover_image
        coverImage: true,
        logo: true,
        latitude: true,
        longitude: true,
        slug: true,
      },
    });
  }
}
