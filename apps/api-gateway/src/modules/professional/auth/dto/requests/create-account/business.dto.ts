import { PUBLIC_TYPE_BUSINESS } from '@app/shared/enum';
import { removeSpecialCharacters } from '@app/shared/utils';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { OpeningHourDto } from './opening-hour.dto';

export class BusinessDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  business_category_custom: string;

  @IsString()
  @IsNotEmpty()
  placeType: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => removeSpecialCharacters(value))
  zipCode: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  neighbourhood: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsString()
  @IsOptional()
  complement?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  uf: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningHourDto)
  openingHours: OpeningHourDto[];

  @IsEnum(PUBLIC_TYPE_BUSINESS)
  @IsNotEmpty()
  publicType: string;
}
