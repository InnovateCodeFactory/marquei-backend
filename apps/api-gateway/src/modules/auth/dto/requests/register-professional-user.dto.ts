import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';

class BusinessDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "The business's name",
    example: 'Tech Solutions Inc.',
  })
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Latitude of the business location',
    example: 37.7749,
  })
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Longitude of the business location',
    example: -122.4194,
  })
  longitude: number;
}

export class RegisterProfessionalUserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "The professional's name",
    example: 'John Doe',
  })
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: "The professional's email address",
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "The professional's password",
    example: 'securePassword123',
  })
  password: string;

  @IsNotEmpty()
  @Type(() => BusinessDto)
  @ApiProperty({
    description: 'The business details associated with the professional',
    type: BusinessDto,
  })
  business: BusinessDto;
}
