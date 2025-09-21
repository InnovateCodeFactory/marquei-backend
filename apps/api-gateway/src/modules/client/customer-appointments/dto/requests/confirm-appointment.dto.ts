import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Appointment ID' })
  appointment_id: string;
}

