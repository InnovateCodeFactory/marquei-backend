import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;

    // já é array: ok
    if (Array.isArray(value)) return value;

    // 'a,b' -> ['a','b']
    if (typeof value === 'string' && value.includes(',')) {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }

    // 'a' -> ['a']
    return [String(value)];
  })
  @ApiPropertyOptional({
    description: 'IDs de profissionais',
    isArray: true,
    type: String,
    example: ['12345', '67890'],
  })
  professional_ids?: string[];
}
