import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class GetAvailableTimesDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The ID of the service to retrieve available times for.',
    example: '12345',
  })
  service_id?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The ID of the combo to retrieve available times for.',
    example: 'cmb_12345',
  })
  combo_id?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the professional providing the service.',
    example: '67890',
  })
  professional_id: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsNotEmpty()
  @ApiProperty({
    description:
      'The start date to check for available times, in yyyy-MM-dd format.',
    example: '2026-04-23',
    type: String,
  })
  start_date: string;
}
