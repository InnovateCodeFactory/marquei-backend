import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendMailValidationTokenDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ description: 'Email do usuário' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Request ID gerado na validação de telefone' })
  request_id: string;
}

