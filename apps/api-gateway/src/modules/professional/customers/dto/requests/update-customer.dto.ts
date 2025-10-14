import { removeSpecialCharacters } from '@app/shared/utils';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'BusinessCustomer id' })
  id: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Customer name' })
  name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => removeSpecialCharacters(value))
  @ApiPropertyOptional({ description: 'Customer phone' })
  phone?: string;

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Customer email' })
  email?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Birthdate in ISO format YYYY-MM-DD' })
  birthdate?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Notes bound to business' })
  notes?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Block/unblock customer for this business' })
  isBlocked?: boolean;
}
