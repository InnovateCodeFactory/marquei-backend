import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const GENERAL_LINK_KEYS = [
  'terms_of_service_url',
  'privacy_policy_url',
  'help_center_url',
  'facebook_url',
  'instagram_url',
  'twitter_url',
  'linkedin_url',
  'marquei_app_store_url',
  'marquei_play_store_url',
  'marquei_pro_app_store_url',
  'marquei_pro_play_store_url',
] as const;

export type GeneralLinkKey = (typeof GENERAL_LINK_KEYS)[number];

export class GetGeneralLinkDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(GENERAL_LINK_KEYS as unknown as string[], {
    message: 'Invalid link key',
  })
  @ApiProperty({ enum: GENERAL_LINK_KEYS })
  key!: GeneralLinkKey;
}
