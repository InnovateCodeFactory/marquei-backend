import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class FindCustomersDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Search term to filter customers by name, or email',
    example: 'John Doe',
  })
  search?: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Page number for pagination',
    example: '1',
  })
  page: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Number of customers per page',
    example: '10',
  })
  limit: string;
}
