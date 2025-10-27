import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class BlockTimesDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @ApiProperty({
    description: 'Start date in yyyy-MM-dd (business local time)',
    example: '2025-01-31',
  })
  start_date: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @ApiProperty({
    description: 'End date in yyyy-MM-dd (business local time)',
    required: false,
    example: '2025-02-02',
  })
  end_date?: string;

  @IsBoolean()
  @ApiProperty({
    description:
      'If true, blocks the whole day(s) and ignores start_time/end_time',
    example: false,
  })
  all_day: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  @ApiProperty({
    description: 'Start time HH:mm (required when all_day=false)',
    required: false,
    example: '09:00',
  })
  start_time?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  @ApiProperty({
    description: 'End time HH:mm (required when all_day=false)',
    required: false,
    example: '18:00',
  })
  end_time?: string;
}
