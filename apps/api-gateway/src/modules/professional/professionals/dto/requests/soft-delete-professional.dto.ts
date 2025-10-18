import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SoftDeleteProfessionalDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID do perfil profissional a ser desativado',
  })
  professionalProfileId: string;
}