import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import { EditPreferredContentDto } from '../dto/requests/edit-preffered-content.dto';

@Injectable()
export class EditPreferredContentUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(dto: EditPreferredContentDto, req: AppRequest) {
    await this.prismaService.person.update({
      where: { id: req.user.personId },
      data: {
        preferred_content_genre: dto.public_type,
      },
      select: {
        id: true,
      },
    });

    return null;
  }
}
