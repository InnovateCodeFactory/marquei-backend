import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/isPublic.decorator';
import { RedisService } from '../modules/redis/redis.service';
import { ACCESS_TOKEN_COOKIE, getCookieValue } from '../utils/cookies';

type UserType = 'PROFESSIONAL' | 'CUSTOMER';

interface JwtPayload {
  id: string;
  user_type: UserType;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Ignora contexts que não sejam HTTP (ex.: RabbitMQ, WS)
    if (context.getType() !== 'http') return true;

    // Respeita rotas públicas
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getClass(),
      context.getHandler(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token =
      this.extractTokenFromHeader(request) ||
      this.extractTokenFromCookies(request);
    if (!token) throw new UnauthorizedException('Token não fornecido');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    if (!payload?.id || !payload?.user_type) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const { id: userId, user_type } = payload;

    // Busca o usuário conforme o tipo
    if (user_type === 'PROFESSIONAL') {
      const user =
        await this.redisService.getCurrentUserProfessionalFromRequest({
          userId,
        });

      if (!user) throw new NotFoundException('Usuário não encontrado');

      const currentBusiness = user.CurrentSelectedBusiness?.[0]?.business;

      // Popula request.user para PROFESSIONAL
      (request as any).user = {
        id: user.id,
        user_type: user.user_type,
        name: this.resolveDisplayName({
          name: user?.name,
          email: user?.email,
        }),
        push_token: user?.push_token || null,
        current_selected_business_slug: currentBusiness?.slug || null,
        current_selected_business_id: currentBusiness?.id || null,
        current_business_subscription_status:
          currentBusiness?.BusinessSubscription?.[0]?.status || null,
        current_business_subscription_plan_name:
          currentBusiness?.BusinessSubscription?.[0]?.plan?.name || null,
        current_business_subscription_plan_billing_period:
          currentBusiness?.BusinessSubscription?.[0]?.plan?.billing_period ||
          null,
        current_business_subscription_current_period_end:
          currentBusiness?.BusinessSubscription?.[0]?.current_period_end ||
          null,
        professional_profile_id:
          currentBusiness?.professionals?.[0]?.id || null,
      };

      return true;
    }

    if (user_type === 'CUSTOMER') {
      const user = await this.redisService.getCurrentUserCustomerFromRequest({
        userId,
      });

      if (!user) throw new NotFoundException('Usuário não encontrado');

      // Popula request.user para CUSTOMER
      (request as any).user = {
        id: user.id,
        user_type: user.user_type,
        name: this.resolveDisplayName({
          name: user?.name,
          email: user?.email,
        }),
        push_token: user?.push_token || null,
        personId: user?.personId || null,
      };

      return true;
    }

    // Se chegou aqui, o user_type não é suportado
    throw new UnauthorizedException('Tipo de usuário não suportado');
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') || [];
    if (type?.toLowerCase() === 'bearer' && token) return token;
    return undefined;
  }

  private extractTokenFromCookies(request: Request): string | undefined {
    return getCookieValue(request, ACCESS_TOKEN_COOKIE);
  }

  private resolveDisplayName({
    name,
    email,
  }: {
    name?: string | null;
    email?: string | null;
  }): string | null {
    const normalizedName = name?.trim();
    if (normalizedName) return normalizedName;

    const normalizedEmail = email?.trim();
    if (normalizedEmail) return normalizedEmail;

    return null;
  }
}
