import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubscribeToPlanDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the price of the plan to subscribe to',
    example: 'price_12345',
  })
  price_id: string;
}
