import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelCustomerAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Appointment ID' })
  appointment_id: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Optional reason for canceling' })
  reason?: string;
}

