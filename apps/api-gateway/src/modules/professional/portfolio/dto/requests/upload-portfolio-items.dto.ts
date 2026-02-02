import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class UploadPortfolioItemsDto {
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value[0] : value))
  @IsString()
  folder_id?: string;
}
