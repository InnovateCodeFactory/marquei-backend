import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class FilterBusinessesDto {
  @IsNotEmpty()
  @IsNumberString()
  @ApiProperty({
    description: 'Página atual para paginação (padrão: 1)',
    example: '1',
    required: true,
  })
  page: string = '1';

  @IsNotEmpty()
  @IsNumberString()
  @ApiProperty({
    description: 'Número de itens por página para paginação (padrão: 10)',
    example: '10',
    required: true,
  })
  limit: string = '10';

  @IsOptional()
  @IsString()
  @MinLength(3)
  @ApiPropertyOptional({
    description: 'Nome do negócio para busca parcial (mínimo 3 caracteres)',
    example: 'Beleza',
    required: false,
  })
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Categorias do negócio para filtro exato',
    example: ['categ-id-1', 'categ-id-2'],
    required: false,
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;

    // já array? (categories=id1&categories=id2)
    if (Array.isArray(value)) return value;

    // string simples ou "a,b,c"
    if (typeof value === 'string') {
      return value.includes(',')
        ? value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [value];
    }
    return undefined;
  })
  categories?: string[];
}
