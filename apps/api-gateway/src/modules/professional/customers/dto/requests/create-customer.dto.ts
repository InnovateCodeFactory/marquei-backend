import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
}
