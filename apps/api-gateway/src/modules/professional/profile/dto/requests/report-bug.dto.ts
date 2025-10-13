import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReportBugDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Descrição do bug relatado',
    example: 'O botão de login não está funcionando',
  })
  description: string;
}

