import { EnvSchemaType } from '@app/shared/environment';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RevenueCatWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService<EnvSchemaType>) {}

  canActivate(context: ExecutionContext): boolean {
    return true;
    if (context.getType() !== 'http') return true;
    const req = context
      .switchToHttp()
      .getRequest<Request & { headers?: any }>();
    const header = req.headers?.authorization || '';
    const token = this.extractBearerToken(header);
    const expected = this.config.getOrThrow('REVENUE_CAT_BEARER_TOKEN');

    if (!token || token !== expected) {
      throw new UnauthorizedException('Invalid RevenueCat token');
    }

    return true;
  }

  private extractBearerToken(value: string): string | null {
    const [type, token] = value.split(' ');
    if (!type || !token) return null;
    if (type.toLowerCase() !== 'bearer') return null;
    return token.trim();
  }
}
