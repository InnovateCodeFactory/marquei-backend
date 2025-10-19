import { systemGeneralSettings } from '@app/shared/config/system-general-settings';
import { FileSystemService } from '@app/shared/services';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetGeneralLinksUseCase {
  constructor(private readonly fileSystem: FileSystemService) {}

  async execute() {
    const privacy = systemGeneralSettings.privacy_policy_url;
    const terms = systemGeneralSettings.terms_of_service_url;

    return {
      instagram_url: systemGeneralSettings.instagram_url,
      linkedin_url: systemGeneralSettings.linkedin_url,
      whatsapp_number: systemGeneralSettings.whatsapp_number,
      privacy_policy_url: privacy
        ? this.fileSystem.getPublicUrl({ key: privacy })
        : null,
      terms_of_service_url: terms
        ? this.fileSystem.getPublicUrl({ key: terms })
        : null,
    };
  }
}
