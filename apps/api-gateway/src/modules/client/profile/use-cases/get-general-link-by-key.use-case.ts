import {
  systemGeneralSettings,
  type SystemGeneralSettings,
} from '@app/shared/config/system-general-settings';
import { FileSystemService } from '@app/shared/services';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GENERAL_LINK_KEYS,
  GetGeneralLinkDto,
} from '../dto/requests/get-general-link.dto';

@Injectable()
export class GetGeneralLinkByKeyUseCase {
  constructor(private readonly fileSystem: FileSystemService) {}

  async execute({ key }: GetGeneralLinkDto) {
    console.log({ key });

    if (!GENERAL_LINK_KEYS.includes(key)) {
      throw new BadRequestException('Invalid link key');
    }

    const value = systemGeneralSettings[key as keyof SystemGeneralSettings] as
      | string
      | null;

    console.log(value);

    // transform file keys for specific fields to public URLs
    const needsPublicUrl =
      key === 'privacy_policy_url' || key === 'terms_of_service_url';
    const finalValue =
      needsPublicUrl && value
        ? this.fileSystem.getPublicUrl({ key: value })
        : value;

    return { key, value: finalValue };
  }
}
