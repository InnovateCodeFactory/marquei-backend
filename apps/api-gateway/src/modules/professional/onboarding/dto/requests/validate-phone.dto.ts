import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidatePhoneDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Código de validação enviado via WhatsApp' })
  code: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID da requisição de validação' })
  request_id: string;
}

