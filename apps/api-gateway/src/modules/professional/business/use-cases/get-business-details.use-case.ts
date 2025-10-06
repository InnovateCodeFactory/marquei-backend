import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class GetBusinessDetailsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute(user: CurrentUser) {
    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        description: true,
        phone: true,
        email: true,
        website: true,
        instagram: true,
        opening_hours: true,
        zipCode: true,
        street: true,
        neighbourhood: true,
        number: true,
        complement: true,
        city: true,
        uf: true,
        logo: true,
        coverImage: true,
        slug: true,
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    return {
      ...business,
      logo: business.logo
        ? this.fileSystem.getPublicUrl({
            key: business.logo,
          })
        : null,
      cover_image: business.coverImage
        ? this.fileSystem.getPublicUrl({ key: business.coverImage })
        : null,
    };
  }
}
