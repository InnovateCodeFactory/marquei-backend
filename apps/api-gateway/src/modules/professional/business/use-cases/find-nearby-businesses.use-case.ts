import { PrismaService } from '@app/shared';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FindNearbyBusinessesDto } from '../dto/requests/find-nearby-businesses.dto';

@Injectable()
export class FindNearbyBusinessesUseCase implements OnModuleInit {
  private readonly logger = new Logger(FindNearbyBusinessesUseCase.name);

  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    //-16.022402, -48.073285
    // await this.execute({
    //   radius: 5000,
    //   latitude: -16.022402, // Exemplo de latitude
    //   longitude: -48.073285, // Exemplo de longitude
    // });
  }

  async execute(payload: FindNearbyBusinessesDto) {
    const { latitude, longitude, radius } = payload;

    const businesses = await this.prismaService.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        latitude: number;
        longitude: number;
      }>
    >`
      SELECT id, name, slug, latitude, longitude
      FROM "Business"
      WHERE ST_DWithin(
        "location"::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${radius}
      );
    `;

    this.logger.debug(businesses);

    return businesses;
  }
}
