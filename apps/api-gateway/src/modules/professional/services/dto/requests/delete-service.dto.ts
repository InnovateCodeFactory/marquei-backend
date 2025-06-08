import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteServiceDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The id of the service to be deleted',
    example: 'service-12345',
  })
  id: string;
}
