import { IsNotEmpty, IsString } from 'class-validator';

export class GetRatingPromptDto {
  @IsString()
  @IsNotEmpty()
  business_slug: string;
}
