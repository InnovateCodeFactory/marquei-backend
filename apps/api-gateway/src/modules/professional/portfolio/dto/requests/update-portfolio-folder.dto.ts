import { IsString, Length } from 'class-validator';

export class UpdatePortfolioFolderDto {
  @IsString()
  @Length(2, 60)
  name: string;
}
