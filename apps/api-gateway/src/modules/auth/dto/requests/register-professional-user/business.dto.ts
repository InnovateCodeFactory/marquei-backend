import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
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
  @IsNotEmpty()
  placeType: string;

  @IsString()
  @IsNotEmpty()
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
  complement: string;

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
}
