import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class GetCustomerAppointmentsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The ID of the business customer',
    example: '12345',
  })
  id: string;

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: '1',
  })
  page?: string;

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({
    description: 'Number of appointments per page',
    example: '20',
  })
  limit?: string;
}
