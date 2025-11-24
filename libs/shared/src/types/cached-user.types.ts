export interface CachedUserProps {
  user_type: string;
  id: string;
  push_token?: string | null;
  CurrentSelectedBusiness: CurrentSelectedBusiness[];
}

interface CurrentSelectedBusiness {
  business: Business;
}

interface Business {
  slug: string;
  id: string;
  BusinessSubscription: BusinessSubscription[];
  professionals: {
    id: string;
  }[];
}

interface BusinessSubscription {
  status: string;
  plan: Plan;
  current_period_end: Date;
}

interface Plan {
  name: string;
  billing_period: string;
}
