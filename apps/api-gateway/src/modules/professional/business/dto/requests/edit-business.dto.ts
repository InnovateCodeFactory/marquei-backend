import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

export class EditBusinessDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Business name' })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Business description' })
  description?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Business phone' })
  phone?: string | null;

  @IsOptional()
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @ApiPropertyOptional({ description: 'Business email' })
  email?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Website URL' })
  website?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Instagram URL' })
  instagram?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Zip code' })
  zipCode?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Street' })
  street?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Neighbourhood' })
  neighbourhood?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Number' })
  number?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Complement' })
  complement?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'City' })
  city?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'UF' })
  uf?: string | null;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Opening hours JSON object' })
  opening_hours?: any;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({ description: 'Business latitude' })
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiPropertyOptional({ description: 'Business longitude' })
  longitude?: number;
}
