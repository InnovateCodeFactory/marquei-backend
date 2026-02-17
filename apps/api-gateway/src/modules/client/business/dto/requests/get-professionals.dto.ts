import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetProfessionalsForAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The slug of the business',
    example: 'my-business-slug',
  })
  slug: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The ID of the service to book an appointment for',
    example: 'service-12345',
  })
  service_id?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The ID of the combo to book an appointment for',
    example: 'combo-12345',
  })
  combo_id?: string;
}
