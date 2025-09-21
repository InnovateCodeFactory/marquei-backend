import { removeSpecialCharacters } from '@app/shared/utils';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The name of the customer',
    example: 'John Doe',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => removeSpecialCharacters(value))
  @ApiProperty({
    description: 'The phone number of the customer',
    example: '+1234567890',
  })
  phone: string;

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The email address of the customer',
  })
  email?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The birthdate of the customer in ISO format',
    example: '1990-01-01',
  })
  birthdate?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Additional notes about the customer',
    example: 'Preferred contact method is email',
  })
  notes?: string;
}
