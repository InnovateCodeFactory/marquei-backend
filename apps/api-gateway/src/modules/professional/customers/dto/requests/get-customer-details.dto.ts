import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetCustomerDetailsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the business customer',
    example: '12345',
  })
  id: string;
}
