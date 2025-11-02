import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RescheduleCustomerAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Appointment ID to reschedule' })
  appointment_id: string;

  @IsISO8601()
  @IsNotEmpty()
  @ApiProperty({ description: 'New appointment date in ISO 8601 (UTC)' })
  new_date: string; // ISO UTC string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Professional profile id' })
  professional_id?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Service id for the appointment' })
  service_id?: string;
}
