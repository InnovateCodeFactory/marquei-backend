export const CachedKeys = {
  PROFESSIONAL_PASSWORD_UPDATE: ({
    user_id,
    request_id,
  }: {
    user_id: string;
    request_id: string;
  }) => `professional:password-update:${user_id}:${request_id}`,
};
