import { removeSpecialCharacters, removeWhitespaces } from '@app/shared/utils';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserCustomerDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Device token for the customer',
    example: 'device_token_example',
  })
  device_token?: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Email address of the customer',
    example: 'email@test.com',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Name of the customer',
    example: 'John Doe',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    removeWhitespaces(removeSpecialCharacters(value)?.trim()),
  )
  @ApiProperty({
    description: 'Phone number of the customer',
    example: '+1234567890',
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({
    description: 'Password for the customer account',
    example: 'securepassword',
  })
  password: string;
}
