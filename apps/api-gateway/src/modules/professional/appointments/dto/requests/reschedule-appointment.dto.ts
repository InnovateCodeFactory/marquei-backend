import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the appointment to be canceled',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  appointment_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The date and time of the appointment',
    example: '2023-10-01T10:00:00Z',
  })
  @IsISO8601()
  new_appointment_date: Date;
}
