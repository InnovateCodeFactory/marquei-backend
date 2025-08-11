import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class GetServicesDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Número da página para paginação',
    required: false,
    example: '1',
  })
  page?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Número de itens por página para paginação',
    required: false,
    example: '10',
  })
  limit?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Search term to filter service by name',
    example: 'haircut',
  })
  search?: string;
}
