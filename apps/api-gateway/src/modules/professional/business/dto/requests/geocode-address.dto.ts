import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsPostalCode, IsString } from 'class-validator';

export class GeocodeAddressDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Street name' })
  street?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Street number' })
  number?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'City (default: Brasília)' })
  city?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'State UF (default: DF)' })
  uf?: string;

  @IsOptional()
  @IsPostalCode('BR')
  @ApiPropertyOptional({ description: 'Zip code (CEP)' })
  zipCode?: string;
}

