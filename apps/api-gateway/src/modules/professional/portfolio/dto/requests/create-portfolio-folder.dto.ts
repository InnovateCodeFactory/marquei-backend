import { IsOptional, IsString, Length } from 'class-validator';

export class CreatePortfolioFolderDto {
  @IsString()
  @Length(2, 60)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
