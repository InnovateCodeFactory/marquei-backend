import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetGeneralLinksUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute() {
    const links = await this.prismaService.systemGeneralSettings.findFirst({
      select: {
        instagram_url: true,
        linkedin_url: true,
        privacy_policy_url: true,
        terms_of_service_url: true,
        whatsapp_number: true,
      },
    });

    return {
      ...links,
      privacy_policy_url: links?.privacy_policy_url
        ? this.fileSystem.getPublicUrl({ key: links.privacy_policy_url })
        : null,
      terms_of_service_url: links?.terms_of_service_url
        ? this.fileSystem.getPublicUrl({ key: links.terms_of_service_url })
        : null,
    };
  }
}

