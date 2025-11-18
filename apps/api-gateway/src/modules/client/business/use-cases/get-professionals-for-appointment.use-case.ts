import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { Injectable } from '@nestjs/common';
import { GetProfessionalsForAppointmentDto } from '../dto/requests/get-professionals.dto';

@Injectable()
export class GetProfessionalsForAppointmentUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(query: GetProfessionalsForAppointmentDto) {
    const professionals = await this.prismaService.professionalProfile.findMany(
      {
        where: {
          business: {
            slug: query.slug,
          },
          status: 'ACTIVE',
          services: {
            some: {
              service_id: query.service_id,
            },
          },
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
      profile_image: this.fs.getPublicUrl({
        key: professional.profile_image,
      }),
    }));
  }
}
