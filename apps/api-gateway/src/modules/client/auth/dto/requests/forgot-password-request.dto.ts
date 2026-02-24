import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ClientForgotPasswordRequestDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ description: 'Customer email' })
  email: string;
}
