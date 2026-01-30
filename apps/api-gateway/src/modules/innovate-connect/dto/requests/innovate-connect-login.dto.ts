import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class InnovateConnectLoginDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  @ApiProperty({
    description: 'Email autorizado para acesso ao Innovate Connect',
    example: 'admin@empresa.com',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @ApiProperty({
    description: 'Senha do acesso Innovate Connect',
    minLength: 8,
    maxLength: 128,
  })
  password: string;
}
