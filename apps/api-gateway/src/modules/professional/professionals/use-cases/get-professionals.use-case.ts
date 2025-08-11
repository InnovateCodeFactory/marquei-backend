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
      where: { business_id: currentUser.current_selected_business_id },
      select: {
        id: true,
        status: true,
        phone: true,
        profile_image: true,
        person: {
          select: {
            name: true,
            personAccount: {
              select: {
                authAccount: {
                  select: {
                    id: true,
                    first_access: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return professionals.map((p) => ({
      professional_profile_id: p.id,
      avatar: p.profile_image || 'https://github.com/alanagabriele.png',
      name: (p.person.name ?? '').split(' ')[0],
      phone: p.phone,
      first_access: p.person.personAccount?.authAccount.first_access ?? false,
      status: p.status,
      user_id: p.person.personAccount?.authAccount.id ?? null,
    }));
  }
}
