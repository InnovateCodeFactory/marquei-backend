import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetServiceTypesUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute() {
    return await this.prismaService.businessServiceType.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
