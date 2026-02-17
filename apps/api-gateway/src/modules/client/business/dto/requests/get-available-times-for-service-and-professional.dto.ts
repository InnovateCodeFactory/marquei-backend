import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetAvailableTimesForServiceAndProfessionalDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'ID of the service to check availability for',
    example: 'service_123',
  })
  service_id?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'ID of the combo to check availability for',
    example: 'combo_123',
  })
  combo_id?: string;

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
