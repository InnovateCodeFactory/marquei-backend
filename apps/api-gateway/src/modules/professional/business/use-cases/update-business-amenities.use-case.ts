import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { BadRequestException, Injectable } from '@nestjs/common';
import { UpdateBusinessAmenitiesDto } from '../dto/requests/update-business-amenities.dto';

@Injectable()
export class UpdateBusinessAmenitiesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(user: CurrentUser, dto: UpdateBusinessAmenitiesDto) {
    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');

    const amenityIds = Array.from(
      new Set((dto?.amenity_ids ?? []).filter(Boolean)),
    );

    if (amenityIds.length) {
      const existingAmenities = await this.prisma.amenities.findMany({
        where: { id: { in: amenityIds } },
        select: { id: true },
      });
      if (existingAmenities.length !== amenityIds.length) {
        throw new BadRequestException('Comodidade inválida');
      }
    }

    const currentAmenities = await this.prisma.businessAmenity.findMany({
      where: { businessId },
      select: { amenityId: true },
    });
    const currentIds = new Set(
      currentAmenities.map((item) => item.amenityId),
    );

    const toAdd = amenityIds.filter((id) => !currentIds.has(id));
    const toRemove = Array.from(currentIds).filter(
      (id) => !amenityIds.includes(id),
    );

    const operations = [];
    if (toRemove.length) {
      operations.push(
        this.prisma.businessAmenity.deleteMany({
          where: { businessId, amenityId: { in: toRemove } },
        }),
      );
    }
    if (toAdd.length) {
      operations.push(
        this.prisma.businessAmenity.createMany({
          data: toAdd.map((amenityId) => ({ businessId, amenityId })),
          skipDuplicates: true,
        }),
      );
    }

    if (operations.length) {
      await this.prisma.$transaction(operations);
    }

    return null;
  }
}
