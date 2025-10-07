import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { BadRequestException, Injectable } from '@nestjs/common';
import { GetGeneralLinkDto, GENERAL_LINK_KEYS } from '../dto/requests/get-general-link.dto';

@Injectable()
export class GetGeneralLinkByKeyUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute({ key }: GetGeneralLinkDto) {
    if (!GENERAL_LINK_KEYS.includes(key)) {
      throw new BadRequestException('Invalid link key');
    }

    const select: any = { [key]: true };
    const row = await this.prisma.systemGeneralSettings.findFirst({ select });
    const value = row?.[key] ?? null;

    const needsPublicUrl = key === 'privacy_policy_url' || key === 'terms_of_service_url';
    const finalValue = needsPublicUrl && value
      ? this.fileSystem.getPublicUrl({ key: value })
      : value;

    return { key, value: finalValue };
  }
}

