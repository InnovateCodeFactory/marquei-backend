import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class GetStatementDto {
  @IsBooleanString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Indicates if should calculate totals',
    example: 'true',
  })
  calculate_totals?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Start date for the statement',
    example: '2023-01-01',
  })
  start_date?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'End date for the statement',
    example: '2023-12-31',
  })
  end_date?: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The page number for pagination',
    example: '1',
  })
  page: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The number of items per page',
    example: '10',
  })
  limit: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The type of statement to retrieve',
    example: 'INCOME',
    enum: ['INCOME', 'EXPENSE'],
  })
  type?: 'INCOME' | 'EXPENSE';

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The ID of the professional to retrieve the statement for',
    example: '12345',
  })
  professional_id?: string;
}
