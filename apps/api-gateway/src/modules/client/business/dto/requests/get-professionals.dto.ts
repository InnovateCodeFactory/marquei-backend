import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetProfessionalsForAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The slug of the business',
    example: 'my-business-slug',
  })
  slug: string;
}
