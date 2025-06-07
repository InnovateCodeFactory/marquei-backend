import { Transform, Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { BusinessDto } from './business.dto';

export class RegisterProfessionalUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.replace(/\D/g, '')) // Remove caracteres especiais
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.replace(/\D/g, '')) // Remove caracteres especiais
  documentNumber: string;

  @ValidateNested()
  @Type(() => BusinessDto)
  business: BusinessDto;
}
