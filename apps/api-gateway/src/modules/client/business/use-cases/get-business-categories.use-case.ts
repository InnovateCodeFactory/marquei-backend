import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetBusinessCategoriesUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute() {
    return this.prismaService.businessCategory.findMany({
      select: {
        name: true,
        id: true,
      },
    });
  }
}
