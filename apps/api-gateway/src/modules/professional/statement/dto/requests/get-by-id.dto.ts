import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetProfessionalStatementByIdDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID do extrato profissional',
    example: 'stmt_1234567890abcdef',
  })
  id: string;
}
