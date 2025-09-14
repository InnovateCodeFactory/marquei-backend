import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString } from 'class-validator';

export class SendPhoneValidationTokenDto {
  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Phone number to send the validation token to',
    example: '5511999999999',
  })
  phone_number: string;
}
