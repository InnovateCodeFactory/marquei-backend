import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordRequestDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ description: 'Professional email' })
  email: string;
}
