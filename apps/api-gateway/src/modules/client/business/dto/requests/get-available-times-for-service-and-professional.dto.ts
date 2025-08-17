import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetAvailableTimesForServiceAndProfessionalDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID of the service to check availability for',
    example: 'service_123',
  })
  service_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID of the professional to check availability for',
    example: 'professional_456',
  })
  professional_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Date to check availability for, in yyyy/MM/dd format',
    example: '2025-08-17',
  })
  day: string; // yyyy-MM-dd

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Slug of the business to check availability for',
    example: 'my-business',
  })
  business_slug: string;
}
