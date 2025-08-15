import { PrismaService } from '@app/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GetBusinessByIdDto } from '../dto/requests/get-business-by-id.dto';

@Injectable()
export class GetBusinessByIdUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(query: GetBusinessByIdDto) {
    const business = await this.prismaService.business.findUnique({
      where: {
        id: query.id,
      },
      select: {
        name: true,
        // TODO: mudar pra cover_image
        coverImage: true,
        logo: true,
        latitude: true,
        longitude: true,
        slug: true,
      },
    });

    if (!business) throw new NotFoundException('Empresa não encontrada');

    return business;
  }
}
