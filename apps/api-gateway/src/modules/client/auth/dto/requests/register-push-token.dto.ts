import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterPushTokenDto {
  @ApiProperty({
    description: 'Push token for notifications',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxxxx]'
  })
  @IsString()
  @IsNotEmpty()
  push_token: string;
}

