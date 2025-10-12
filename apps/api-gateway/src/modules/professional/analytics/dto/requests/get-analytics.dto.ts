import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetAnalyticsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Start date for analytics in ISO format' })
  start_date: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'End date for analytics in ISO format' })
  end_date: string;
}
