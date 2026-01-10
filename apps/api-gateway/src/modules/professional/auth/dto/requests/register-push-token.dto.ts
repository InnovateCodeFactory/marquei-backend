import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterProfessionalPushTokenDto {
  @ApiProperty({
    description: 'Push token for notifications',
    example: 'example-push-token-1234567890',
  })
  @IsString()
  @IsNotEmpty()
  push_token: string;
}
