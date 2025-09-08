import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class GetProfileDetailsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(req: AppRequest) {
    const { personId } = req.user;

    const profile = await this.prismaService.person.findUnique({
      where: { id: personId },
      select: {
        id: true,
        name: true,
        phone: true,
        birthdate: true,
        document_number: true,
        email: true,
      },
    });

    if (!profile) throw new NotFoundException('Perfil não encontrado');

    return profile;
  }
}
