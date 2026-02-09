import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class GetServiceCombosDto {
  @IsNumberString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Página atual',
    example: '1',
  })
  page?: string;

  @IsNumberString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Quantidade de itens por página',
    example: '10',
  })
  limit?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filtro por nome do combo',
    example: 'premium',
  })
  search?: string;

  @IsBooleanString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filtrar combos ativos/inativos',
    example: 'true',
  })
  is_active?: string;
}
