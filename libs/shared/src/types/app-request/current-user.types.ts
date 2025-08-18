export type CurrentUser = {
  id: string;
  user_type: string;
  push_token?: string | null;
  current_selected_business_slug?: string;
  current_selected_business_id?: string;
  current_business_subscription_status?: string;
  current_business_subscription_plan_name?: string;
  current_business_subscription_plan_billing_period?: string;
};

export type CurrentCustomer = {
  id: string;
  user_type: string;
  push_token?: string | null;
};
