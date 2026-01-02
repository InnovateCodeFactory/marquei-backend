import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { formatPhoneNumber, getTwoNames } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';
import { GetBusinessProfessionalsDto } from '../dto/requests/get-business-professionals.dto';

@Injectable()
export class GetBusinessProfessionalsUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(query: GetBusinessProfessionalsDto) {
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
          phone: true,
          profile_image: true,
          User: {
            select: {
              name: true,
            },
          },
        },
      },
    );

    return professionals?.map((professional) => ({
      id: professional.id,
      name: professional.User?.name
        ? getTwoNames(professional.User.name)
        : '',
      phone: professional.phone ? formatPhoneNumber(professional.phone) : null,
      profile_image: professional.profile_image
        ? this.fs.getPublicUrl({
            key: professional.profile_image,
          })
        : null,
    }));
  }
}
