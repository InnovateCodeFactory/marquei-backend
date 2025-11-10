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
} from 'class-validator';

export class UpdateServiceDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID do serviço a ser atualizado',
  })
  serviceId: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'The name of the service',
    required: false,
  })
  name?: string;

  @IsNumber()
  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiProperty({
    description: 'The duration of the service in minutes',
    required: false,
  })
  duration?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiProperty({
    description: 'The price of the service in cents',
    required: false,
  })
  price_in_cents?: number;

  @IsString()
  @IsOptional()
  @Matches(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/)
  @ApiPropertyOptional({
    description: 'Color used to identify the service in calendar (hex #RRGGBB)',
    example: '#4647FA',
    required: false,
  })
  color?: string;

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description:
      'Optional full replacement list of professional profile IDs that execute this service',
    isArray: true,
    type: String,
    required: false,
  })
  professionalsId?: string[];
}
