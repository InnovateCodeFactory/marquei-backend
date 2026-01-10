import { PrismaService } from '@app/shared';
import { normalizeAmenityIcon } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetAmenitiesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const amenities = await this.prisma.amenities.findMany({
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        type: true,
        icon: true,
        lib: true,
      },
    });

    return amenities.map((amenity) => ({
      ...amenity,
      icon: normalizeAmenityIcon(amenity.icon),
    }));
  }
}
