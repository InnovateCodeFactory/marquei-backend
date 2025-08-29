import { AppointmentStatusEnum } from '@app/shared/enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class GetCustomerAppointmentsDto {
  @IsEnum(AppointmentStatusEnum)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter appointments by status',
    enum: AppointmentStatusEnum,
    required: false,
  })
  status?: AppointmentStatusEnum;

  @IsNotEmpty()
  @IsNumberString()
  @ApiProperty({
    description: 'Page number for pagination',
    example: '1',
  })
  page: string;

  @IsNotEmpty()
  @IsNumberString()
  @ApiProperty({
    description: 'Number of items per page for pagination',
    example: '10',
  })
  limit: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @ApiPropertyOptional({
    description: 'Search term to filter appointments',
    example: 'consultation',
    minLength: 3,
    required: false,
  })
  search?: string;
}
