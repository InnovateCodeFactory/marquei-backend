import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateMailCodeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Código de validação enviado por email',
  })
  code: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID da requisição de envio do código',
  })
  request_id: string;
}
