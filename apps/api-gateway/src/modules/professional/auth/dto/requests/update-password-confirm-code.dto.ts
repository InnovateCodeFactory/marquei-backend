import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePasswordConfirmCodeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Código de confirmação enviado via WhatsApp',
    example: '123456',
  })
  code: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID da requisição de validação (request_id)',
    example: '6ialbe7jz7xomy06',
  })
  request_id: string;
}
