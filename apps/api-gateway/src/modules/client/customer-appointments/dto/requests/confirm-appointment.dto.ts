import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ClientConfirmAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Appointment ID' })
  appointment_id: string;
}
