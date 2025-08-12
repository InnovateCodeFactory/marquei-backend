import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class GetProfessionalsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_id) {
      throw new UnauthorizedException(
        'Usuário não autorizado ou sem negócio selecionado',
      );
    }

    const professionals = await this.prismaService.professionalProfile.findMany(
      {
        where: {
          business_id: currentUser.current_selected_business_id,
        },
        select: {
          id: true,
          status: true,
          phone: true,
          profile_image: true,
          User: {
            select: {
              id: true,
              name: true,
              first_access: true,
            },
          },
        },
      },
    );

    return (
      professionals?.map((professional) => ({
        professional_profile_id: professional.id,
        avatar:
          professional.profile_image || 'https://github.com/alanagabriele.png',
        name: professional.User.name?.split(' ')[0],
        phone: professional.phone,
        first_access: professional.User.first_access,
        status: professional.status,
        user_id: professional.User.id,
      })) || []
    );
  }
}
