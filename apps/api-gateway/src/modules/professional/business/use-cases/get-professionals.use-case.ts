import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class GetProfessionalsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_id) {
      throw new UnauthorizedException(
        'Usuário não autorizado ou sem negócio selecionado',
      );
    }

    const professionals = await this.prisma.professionalProfile.findMany({
      where: {
        business_id: currentUser.current_selected_business_id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        profile_image: true,
        person: {
          select: {
            name: true,
          },
        },
      },
    });

    return professionals.map((p) => ({
      id: p.id,
      avatar:
        p.profile_image ??
        'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      name: p.person.name?.split(' ')[0] ?? '',
    }));
  }
}
