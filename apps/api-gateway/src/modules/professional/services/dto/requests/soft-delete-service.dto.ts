import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SoftDeleteServiceDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID do serviço a ser desativado',
  })
  serviceId: string;
}