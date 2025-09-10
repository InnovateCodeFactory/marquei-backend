import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the appointment to be canceled',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  appointment_id: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The reason for canceling the appointment',
    example: 'Imprevisto',
  })
  reason: string;
}
