import { EnvSchemaType } from '@app/shared/environment';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_WEB_PORTAL_URL = 'https://sistema.marquei.app.br';
const PREFERRED_WEB_PORTAL_HOST = 'sistema.marquei.app.br';

export const WEB_SSO_CODE_TTL_SECONDS = 90;
const WEB_SSO_REDIS_PREFIX = 'auth:web-sso:';

export function buildWebSsoRedisKey(code: string): string {
  return `${WEB_SSO_REDIS_PREFIX}${code}`;
}

export function getAllowedWebOrigins(
  config: ConfigService<EnvSchemaType>,
): Set<string> {
  const raw = config.get('WEB_APP_ORIGINS') || '';
  const entries = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const origins = new Set<string>();

  for (const entry of entries) {
    const withProtocol = entry.includes('://') ? entry : `https://${entry}`;
    try {
      origins.add(new URL(withProtocol).origin);
    } catch {
      // Ignora entradas malformadas do ambiente
    }
  }

  return origins;
}

export function getDefaultWebPortalUrl(
  config: ConfigService<EnvSchemaType>,
): string {
  const origins = [...getAllowedWebOrigins(config)];
  const preferred = origins.find(
    (origin) => new URL(origin).host === PREFERRED_WEB_PORTAL_HOST,
  );

  return preferred || origins[0] || DEFAULT_WEB_PORTAL_URL;
}

export function normalizeWebPortalReturnTo({
  value,
  config,
}: {
  value?: string | null;
  config: ConfigService<EnvSchemaType>;
}): string | null {
  if (!value) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BadRequestException('URL de retorno inválida');
  }

  const isHttp = parsed.protocol === 'http:';
  const isHttps = parsed.protocol === 'https:';
  if (!isHttp && !isHttps) {
    throw new BadRequestException('URL de retorno inválida');
  }

  const isProd = config.get('NODE_ENV') === 'production';
  if (isProd && !isHttps) {
    throw new BadRequestException(
      'URL de retorno deve usar HTTPS em produção',
    );
  }

  const allowedOrigins = getAllowedWebOrigins(config);
  if (allowedOrigins.size === 0) {
    allowedOrigins.add(new URL(DEFAULT_WEB_PORTAL_URL).origin);
    if (!isProd) {
      allowedOrigins.add('http://localhost:4200');
      allowedOrigins.add('http://localhost:8080');
    }
  }

  if (!allowedOrigins.has(parsed.origin)) {
    throw new BadRequestException('Origem de retorno não permitida');
  }

  return parsed.toString();
}
