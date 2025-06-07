import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
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
}
