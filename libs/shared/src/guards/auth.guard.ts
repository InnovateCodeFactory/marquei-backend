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
import { PrismaService } from '../modules/database/database.service';
import { RedisService } from '../modules/redis/redis.service';

type JwtPayload = { id: string }; // id da AuthAccount

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
    private jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      // Ignora chamadas que não sejam HTTP (ex: RabbitMQ, WebSocket etc.)
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getClass(),
      context.getHandler(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException('Token não fornecido');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    if (!payload?.id)
      throw new UnauthorizedException('Token inválido ou expirado');

    // Busca do "account" (AuthAccount) + negócio selecionado via Redis helper refatorado
    const account = await this.redisService.getCurrentUserFromRequest({
      accountId: payload.id,
    });
    if (!account) throw new NotFoundException('Usuário não encontrado');

    const currentBusiness = account.CurrentSelectedBusiness?.[0]?.business;

    // Monta o contexto do request (tipos conforme seu CurrentUser)
    (request as any).user = {
      id: account.id, // AuthAccount.id
      // user_type removido no novo modelo; adicione apenas se você fizer um shim
      current_selected_business_slug: currentBusiness?.slug ?? null,
      current_selected_business_id: currentBusiness?.id ?? null,
      current_business_subscription_status:
        currentBusiness?.BusinessSubscription?.[0]?.status ?? null,
      current_business_subscription_plan_name:
        currentBusiness?.BusinessSubscription?.[0]?.plan?.name ?? null,
      current_business_subscription_plan_billing_period:
        currentBusiness?.BusinessSubscription?.[0]?.plan?.billing_period ??
        null,
    };

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') || [];
    if (type && type.toLowerCase() === 'bearer' && token) return token;

    return undefined;
  }
}
