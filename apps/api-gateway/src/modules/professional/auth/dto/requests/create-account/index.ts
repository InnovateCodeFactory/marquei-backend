import { removeSpecialCharacters } from '@app/shared/utils';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { BusinessDto } from './business.dto';

export class CreateAccountDto {
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
  @Transform(({ value }) => removeSpecialCharacters(value))
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => removeSpecialCharacters(value))
  documentNumber: string;

  @ValidateNested()
  @Type(() => BusinessDto)
  business: BusinessDto;
}
