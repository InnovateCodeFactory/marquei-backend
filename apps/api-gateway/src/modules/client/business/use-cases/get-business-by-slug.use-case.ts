import { PrismaService } from '@app/shared';
import { buildAddress, normalizeAmenityIcon } from '@app/shared/utils';
import { FileSystemService } from '@app/shared/services';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GetBusinessBySlugDto } from '../dto/requests/get-business-by-slug.dto';

@Injectable()
export class GetBusinessBySlugUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(query: GetBusinessBySlugDto) {
    const business = await this.prismaService.business.findUnique({
      where: {
        slug: query.slug,
      },
      select: {
        name: true,
        description: true,
        phone: true,
        email: true,
        website: true,
        instagram: true,
        opening_hours: true,
        // TODO: mudar pra cover_image
        coverImage: true,
        logo: true,
        latitude: true,
        longitude: true,
        slug: true,
        id: true,
        street: true,
        number: true,
        neighbourhood: true,
        city: true,
        uf: true,
        complement: true,
        amenities: {
          select: {
            amenity: {
              select: {
                id: true,
                title: true,
                type: true,
                icon: true,
                lib: true,
              },
            },
          },
        },
      },
    });

    if (!business) throw new NotFoundException('Empresa não encontrada');

    return {
      id: business.id,
      name: business.name,
      latitude: business.latitude,
      longitude: business.longitude,
      slug: business.slug,
      description: business.description,
      phone: business.phone,
      email: business.email,
      website: business.website,
      instagram: business.instagram,
      opening_hours: business.opening_hours,
      cover_image: this.fs.getPublicUrl({ key: business.coverImage }),
      logo: this.fs.getPublicUrl({ key: business.logo }),
      address: buildAddress({
        street: business.street,
        number: business.number,
        neighbourhood: business.neighbourhood,
        city: business.city,
        uf: business.uf,
        complement: business.complement,
      }),
      amenities: (business.amenities || [])
        .map((item) => item.amenity)
        .filter(Boolean)
        .map((amenity) => ({
          ...amenity,
          icon: normalizeAmenityIcon(amenity.icon),
        }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    };
  }
}
