import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @IsISO8601()
  @IsNotEmpty()
  @ApiProperty({
    description:
      'The start date to check for available times, in ISO 8601 format.',
    example: '2023-10-01T00:00:00Z',
    type: String,
  })
  start_date: string;
}
