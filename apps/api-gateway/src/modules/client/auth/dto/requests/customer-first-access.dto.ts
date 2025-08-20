import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class CustomerFirstAccessDto {
  @IsObject()
  @IsNotEmpty()
  @ApiProperty({
    description: "The customer's device information",
  })
  device_info: Record<string, any>;
}
