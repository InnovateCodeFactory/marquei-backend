import { IsOptional, IsString } from 'class-validator';

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
}
