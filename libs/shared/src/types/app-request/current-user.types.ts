import { BusinessPublicTypeEnum } from '@app/shared/enum';

export type CurrentUser = {
  id: string;
  user_type: 'CUSTOMER' | 'PROFESSIONAL';
  push_token?: string | null;
  personId?: string | null;
  preferred_content_genre?: BusinessPublicTypeEnum | null;
  current_selected_business_slug?: string;
  current_selected_business_id?: string;
  current_business_subscription_status?: string;
  current_business_subscription_plan_name?: string;
  current_business_subscription_plan_billing_period?: string;
  professional_profile_id?: string | null;
};
