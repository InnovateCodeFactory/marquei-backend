import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { GetProfessionalsForAppointmentDto } from '../dto/requests/get-professionals.dto';

@Injectable()
export class GetProfessionalsForAppointmentUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(query: GetProfessionalsForAppointmentDto) {
    const professionals = await this.prismaService.professionalProfile.findMany(
      {
        where: {
          business: {
            slug: query.slug,
          },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          User: {
            select: {
              name: true,
            },
          },
          profile_image: true,
        },
      },
    );

    return professionals?.map((professional) => ({
      id: professional.id,
      name: professional.User?.name?.split(' ')[0] || '',
      profile_image: professional.profile_image,
    }));
  }
}
