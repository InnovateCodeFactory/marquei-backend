import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  IsArray,
  ArrayNotEmpty,
  IsUUID,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The name of the service',
  })
  name: string;

  @IsNumber()
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The duration of the service in minutes',
  })
  duration: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The price of the service in cents',
  })
  price_in_cents: number;

  @IsString()
  @IsOptional()
  @Matches(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/)
  @ApiPropertyOptional({
    description: 'Color used to identify the service in calendar (hex #RRGGBB)',
    example: '#4647FA',
  })
  color?: string;

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'Optional list of professional profile IDs that execute this service',
    type: String,
    isArray: true,
  })
  professionalsId?: string[];
}
