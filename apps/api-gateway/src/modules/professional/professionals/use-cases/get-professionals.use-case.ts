import { PrismaService } from '@app/shared';
import { ProfessionalStatus } from '@app/shared/enum';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatPhoneNumber, getTwoNames } from '@app/shared/utils';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { GetProfessionalDto } from './../dto/requests/get-professional.dto';

@Injectable()
export class GetProfessionalsUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(query: GetProfessionalDto, currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_id) {
      throw new UnauthorizedException(
        'Usuário não autorizado ou sem negócio selecionado',
      );
    }

    const { status } = query;

    const professionals = await this.prismaService.professionalProfile.findMany(
      {
        where: {
          business_id: currentUser.current_selected_business_id,
          ...(status && { status: { equals: status as ProfessionalStatus } }),
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
              email: true,
              first_access: true,
            },
          },
        },
      },
    );

    return (
      professionals?.map((professional) => ({
        professional_profile_id: professional.id,
        avatar: this.fs.getPublicUrl({ key: professional.profile_image }),
        name: getTwoNames(professional.User.name),
        email: professional.User.email,
        phone: formatPhoneNumber(professional.phone),
        first_access: professional.User.first_access,
        status: professional.status,
        user_id: professional.User.id,
      })) || []
    );
  }
}
