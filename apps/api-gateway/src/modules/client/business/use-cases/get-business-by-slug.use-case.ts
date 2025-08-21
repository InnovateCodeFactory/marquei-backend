import { PrismaService } from '@app/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GetBusinessBySlugDto } from '../dto/requests/get-business-by-slug.dto';

@Injectable()
export class GetBusinessBySlugUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(query: GetBusinessBySlugDto) {
    const business = await this.prismaService.business.findUnique({
      where: {
        slug: query.slug,
      },
      select: {
        name: true,
        // TODO: mudar pra cover_image
        coverImage: true,
        logo: true,
        latitude: true,
        longitude: true,
        slug: true,
        id: true,
      },
    });

    if (!business) throw new NotFoundException('Empresa não encontrada');

    return business;
  }
}
