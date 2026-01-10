export const CachedKeys = {
  PROFESSIONAL_PASSWORD_UPDATE: ({
    user_id,
    request_id,
  }: {
    user_id: string;
    request_id: string;
  }) => `professional:password-update:${user_id}:${request_id}`,

  PROFESSIONAL_ANALYTICS: ({
    business_slug,
    end_date,
    start_date,
  }: {
    business_slug: string;
    start_date: string;
    end_date: string;
  }) => `professional:analytics:${business_slug}:${start_date}_${end_date}`,

  PROFESSIONAL_DASHBOARD_ANALYTICS: ({
    business_slug,
    end_date,
    start_date,
  }: {
    business_slug: string;
    start_date: string;
    end_date: string;
  }) => `professional:analytics:dashboard:${business_slug}:${start_date}_${end_date}`,

  CUSTOMER_PASSWORD_RESET: ({ request_id }: { request_id: string }) =>
    `customer:password-reset:${request_id}`,
};
