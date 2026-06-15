import { CustomerServicePlanCycleType, CustomerServicePlanStatus } from '@prisma/client';
import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCustomerServicePlanDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsInt()
  @Min(0)
  price_in_cents: number;

  @IsEnum(CustomerServicePlanCycleType)
  @IsOptional()
  cycle_type?: CustomerServicePlanCycleType;

  @IsInt()
  @Min(1)
  @IsOptional()
  cycle_interval_months?: number;

  @IsInt()
  @Min(1)
  credits_per_cycle: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  max_uses_per_week?: number;

  @IsBoolean()
  @IsOptional()
  allow_multiple_uses_same_week?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  min_days_between_uses?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  max_future_bookings?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  booking_window_days?: number;

  @IsBoolean()
  @IsOptional()
  allow_client_recurring_booking?: boolean;

  @IsBoolean()
  @IsOptional()
  allow_client_single_booking?: boolean;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  service_ids?: string[];

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  combo_ids?: string[];
}

export class UpdateCustomerServicePlanDto extends PartialType(
  CreateCustomerServicePlanDto,
) {
  @IsEnum(CustomerServicePlanStatus)
  @IsOptional()
  status?: CustomerServicePlanStatus;
}
