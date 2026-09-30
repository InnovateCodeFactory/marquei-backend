import { CustomerPlanSubscriptionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCustomerPlanSubscriptionDto {
  @IsString()
  plan_id: string;

  @IsString()
  customer_id: string;

  @IsString()
  revenue_professional_profile_id: string;
}

export class ListCustomerPlanSubscriptionsDto {
  @IsString()
  @IsOptional()
  customer_id?: string;

  @IsEnum(CustomerPlanSubscriptionStatus)
  @IsOptional()
  status?: CustomerPlanSubscriptionStatus;

  // cycle_end: vencimento mais próximo primeiro (visão "quem vai pagar de novo")
  @IsIn(['cycle_end', 'recent'])
  @IsOptional()
  sort?: 'cycle_end' | 'recent';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;
}
