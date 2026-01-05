import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getCookieValue,
} from '@app/shared/utils/cookies';
import { IS_PUBLIC_KEY } from '@app/shared/decorators/isPublic.decorator';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getClass(),
      context.getHandler(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const method = (req.method || '').toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;

    if (!this.isWebClient(req)) return true;

    const accessToken = getCookieValue(req, ACCESS_TOKEN_COOKIE);
    const refreshToken = getCookieValue(req, REFRESH_TOKEN_COOKIE);
    if (!accessToken && !refreshToken) return true;

    const csrfCookie = getCookieValue(req, CSRF_TOKEN_COOKIE);
    const csrfHeader = this.getCsrfHeader(req);

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }

  private getCsrfHeader(req: Request): string | undefined {
    const header =
      (req.headers['x-csrf-token'] as string | string[] | undefined) ||
      (req.headers['x-xsrf-token'] as string | string[] | undefined);
    if (Array.isArray(header)) return header[0];
    return header?.trim() || undefined;
  }

  private isWebClient(req: Request): boolean {
    const header = req.headers['x-client-platform'];
    if (Array.isArray(header)) {
      return header.some((value) => value.toLowerCase() === 'web');
    }
    return header?.toLowerCase() === 'web';
  }
}
