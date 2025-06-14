export interface CachedUserProps {
  user_type: string;
  id: string;
  CurrentSelectedBusiness: CurrentSelectedBusiness[];
}

interface CurrentSelectedBusiness {
  business: Business;
}

interface Business {
  slug: string;
  id: string;
  BusinessSubscription: BusinessSubscription[];
}

interface BusinessSubscription {
  status: string;
  plan: Plan;
}

interface Plan {
  name: string;
  billing_period: string;
}
