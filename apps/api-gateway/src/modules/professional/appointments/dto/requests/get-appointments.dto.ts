import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GetAppointmentsDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter by professional profile id',
    example: 'cmig0u8u3001gqf01wj0qzngf',
  })
  professional_profile_id?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Start date (ISO)',
    example: '2025-01-01T00:00:00.000Z',
  })
  start_date?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'End date (ISO)',
    example: '2025-01-31T23:59:59.999Z',
  })
  end_date?: string;
}
