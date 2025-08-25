import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserCustomerDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Device token for the customer',
    example: 'device_token_example',
  })
  device_token: string;

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
