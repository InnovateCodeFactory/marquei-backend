import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
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
}