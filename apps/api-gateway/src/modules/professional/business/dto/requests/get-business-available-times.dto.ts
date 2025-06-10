import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class GetBusinessAvailableTimesDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the service to retrieve available times for.',
    example: '12345',
  })
  service_id: string;

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
