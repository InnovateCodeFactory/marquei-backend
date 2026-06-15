import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurringAppointmentFrequency } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCustomerRecurringAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'professional-id-123' })
  professional_id: string;

  @IsISO8601()
  @ApiProperty({ example: '2026-05-06T10:00:00' })
  first_appointment_date: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'service-id-123' })
  service_id?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'combo-id-123' })
  combo_id?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'customer-plan-subscription-id-123' })
  plan_subscription_id?: string;

  @IsEnum(RecurringAppointmentFrequency)
  @IsOptional()
  @ApiPropertyOptional({
    enum: RecurringAppointmentFrequency,
    default: RecurringAppointmentFrequency.WEEKLY,
  })
  frequency?: RecurringAppointmentFrequency;

  @IsInt()
  @Min(1)
  @Max(12)
  @ApiProperty({ minimum: 1, maximum: 12, example: 4 })
  occurrences: number;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  @ApiPropertyOptional({ example: 'Recorrência do plano mensal.' })
  notes?: string;
}
