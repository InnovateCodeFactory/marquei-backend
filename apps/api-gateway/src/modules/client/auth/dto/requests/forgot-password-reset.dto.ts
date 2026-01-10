import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordResetDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID da requisição de validação',
  })
  request_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'New password',
  })
  new_password: string;
}
