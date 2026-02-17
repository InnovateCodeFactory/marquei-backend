import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The date and time of the appointment',
    example: '2023-10-01T10:00:00Z',
  })
  appointment_date: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the professional for the appointment',
    example: 'professional-id-123',
  })
  professional_id: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The ID of the service for the appointment',
    example: 'service-id-456',
  })
  service_id?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The ID of the combo for the appointment',
    example: 'combo-id-456',
  })
  combo_id?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Any additional notes for the appointment',
    example: 'Please arrive 10 minutes early.',
    required: false,
  })
  notes?: string;
}
