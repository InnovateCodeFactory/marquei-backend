import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsString,
} from 'class-validator';

export class CreateProfessionalDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'Email do profissional',
  })
  email: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Telefone do profissional',
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Nome do profissional',
  })
  name: string;

  @IsArray()
  @ApiProperty({
    description: 'Lista de serviços (IDs) realizados por este profissional',
    isArray: true,
    type: String,
  })
  servicesId?: string[];
}
