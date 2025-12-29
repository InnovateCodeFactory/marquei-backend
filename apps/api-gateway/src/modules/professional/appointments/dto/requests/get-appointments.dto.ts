import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class GetAppointmentsDto {
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
