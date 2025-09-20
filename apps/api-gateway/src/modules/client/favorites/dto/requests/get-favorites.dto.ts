import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class GetFavoritesDto {
  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Página', example: '1' })
  page: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Limite por página', example: '10' })
  limit: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Filtro por nome do estabelecimento', example: 'barbearia' })
  search?: string;
}

