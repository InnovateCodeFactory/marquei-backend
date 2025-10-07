import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class GetProfessionalProfileDetailsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(req: AppRequest) {
    const { id: userId, current_selected_business_id } = req.user;
    if (!userId) throw new NotFoundException('Usuário não encontrado');

    // Busca ProfessionalProfile do negócio selecionado
    if (!current_selected_business_id)
      throw new BadRequestException('Nenhum negócio selecionado');

    const prof = await this.prisma.professionalProfile.findFirst({
      where: { userId, business_id: current_selected_business_id },
      select: {
        id: true,
        phone: true,
        profile_image: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            document_number: true,
          },
        },
      },
    });

    if (!prof) throw new NotFoundException('Perfil profissional não encontrado');

    return {
      id: prof.id,
      name: prof.User?.name ?? null,
      email: prof.User?.email ?? null,
      document_number: prof.User?.document_number ?? null,
      phone: prof.phone ?? null,
      profile_image: prof.profile_image ?? null,
    };
  }
}

