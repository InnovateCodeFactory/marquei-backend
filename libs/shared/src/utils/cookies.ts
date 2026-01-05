import { Request } from 'express';

export const ACCESS_TOKEN_COOKIE = 'marquei_access_token';
export const REFRESH_TOKEN_COOKIE = 'marquei_refresh_token';
export const CSRF_TOKEN_COOKIE = 'marquei_csrf_token';

export type CookieMap = Record<string, string>;

export function parseCookieHeader(header?: string): CookieMap {
  if (!header) return {};

  return header.split(';').reduce<CookieMap>((acc, part) => {
    const [rawName, ...rest] = part.trim().split('=');
    if (!rawName) return acc;
    acc[rawName] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

export function getCookieValue(
  request: Request,
  name: string,
): string | undefined {
  const cookieBag = (request as Request & { cookies?: CookieMap }).cookies;
  if (cookieBag?.[name]) return cookieBag[name];

  const cookies = parseCookieHeader(request.headers.cookie);
  return cookies[name];
}
