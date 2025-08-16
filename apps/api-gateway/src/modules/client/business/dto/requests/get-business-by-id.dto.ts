import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetBusinessByIdDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the business to retrieve',
    example: '12345',
  })
  id: string;
}
