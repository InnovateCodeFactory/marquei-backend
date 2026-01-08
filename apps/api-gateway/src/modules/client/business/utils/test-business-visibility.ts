import { EnvSchemaType } from '@app/shared/environment';
import { ConfigService } from '@nestjs/config';

const normalizeList = (raw: string): string[] =>
  raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const canViewTestBusinesses = (
  config: ConfigService<EnvSchemaType>,
  userId?: string | null,
): boolean => {
  if (!userId) return false;
  const raw = config.get('TEST_BUSINESS_USER_WHITELIST') ?? '';
  return normalizeList(raw).includes(userId);
};
