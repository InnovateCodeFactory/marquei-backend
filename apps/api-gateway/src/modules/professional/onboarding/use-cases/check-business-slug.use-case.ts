import { PrismaService } from '@app/shared';
import { slugifyBusinessName } from '@app/shared/utils';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CheckBusinessSlugDto } from '../dto/requests/check-business-slug.dto';

@Injectable()
export class CheckBusinessSlugUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute({ name }: CheckBusinessSlugDto) {
    const slug = slugifyBusinessName(name);

    if (!slug) {
      throw new BadRequestException('Nome da empresa invalido');
    }

    const existing = await this.prismaService.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Nome da empresa indisponivel');
    }

    return { slug, available: true };
  }
}
