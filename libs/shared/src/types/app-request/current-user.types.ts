import { BusinessPublicTypeEnum } from '@app/shared/enum';

export type CurrentUser = {
  id: string;
  user_type: 'CUSTOMER' | 'PROFESSIONAL';
  name?: string | null;
  push_token?: string | null;
  personId?: string | null;
  preferred_content_genre?: BusinessPublicTypeEnum | null;
  current_selected_business_slug?: string;
  current_selected_business_id?: string;
  current_business_subscription_status?: string;
  current_business_subscription_plan_name?: string;
  current_business_subscription_plan_billing_period?: string;
  current_business_subscription_current_period_end?: string | null;
  professional_profile_id?: string | null;
};
