import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateProfessionalDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID do profissional a ser atualizado',
  })
  professionalProfileId: string;

  @IsString()
  @IsOptional()
  @IsEmail()
  @ApiProperty({
    description: 'Email do profissional',
    required: false,
  })
  email?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Telefone do profissional',
    required: false,
  })
  phone?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Nome do profissional',
    required: false,
  })
  name?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Lista completa (substituição) de serviços (IDs) realizados por este profissional',
    isArray: true,
    type: String,
    required: false,
  })
  servicesId?: string[];
}
