import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the professional for the appointment',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  professional_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the client for the appointment',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  customer_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The date and time of the appointment',
    example: '2023-10-01T10:00:00Z',
  })
  @IsISO8601()
  appointment_date: Date;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the service associated with the appointment',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  service_id: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  @ApiProperty({
    description: 'Additional notes or comments for the appointment',
    example: 'Please arrive 15 minutes early for the appointment.',
  })
  notes?: string;
}
