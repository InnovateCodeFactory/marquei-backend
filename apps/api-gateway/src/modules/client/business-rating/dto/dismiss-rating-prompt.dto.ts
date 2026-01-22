import { IsNotEmpty, IsString } from 'class-validator';

export class DismissRatingPromptDto {
  @IsString()
  @IsNotEmpty()
  business_slug: string;
}
