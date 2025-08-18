import { ProfessionalStatus } from '@app/shared/enum';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetProfessionalDto {
  @IsString()
  @IsOptional()
  @IsEnum(ProfessionalStatus)
  status?: string;
}
