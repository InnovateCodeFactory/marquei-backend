import { FileSystemService } from '@app/shared/services';
import { systemGeneralSettings, type SystemGeneralSettings } from '@app/shared/config/system-general-settings';
import { BadRequestException, Injectable } from '@nestjs/common';
import { GetGeneralLinkDto, GENERAL_LINK_KEYS } from '../dto/requests/get-general-link.dto';

@Injectable()
export class GetGeneralLinkByKeyUseCase {
  constructor(
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute({ key }: GetGeneralLinkDto) {
    if (!GENERAL_LINK_KEYS.includes(key)) {
      throw new BadRequestException('Invalid link key');
    }

    const value = systemGeneralSettings[key as keyof SystemGeneralSettings] as string | null;

    // transform file keys for specific fields to public URLs
    const needsPublicUrl = key === 'privacy_policy_url' || key === 'terms_of_service_url';
    const finalValue = needsPublicUrl && value
      ? this.fileSystem.getPublicUrl({ key: value })
      : value;

    return { key, value: finalValue };
  }
}
