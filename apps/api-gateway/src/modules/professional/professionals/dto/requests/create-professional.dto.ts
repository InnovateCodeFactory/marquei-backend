import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumberString, IsString } from 'class-validator';

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
}
