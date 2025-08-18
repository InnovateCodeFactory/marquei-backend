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

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
    private jwtService: JwtService,
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

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) throw new UnauthorizedException('Token não fornecido');

    try {
      const payload = await this.jwtService.verifyAsync<{ id: string }>(token);

      if (!payload || !payload.id) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }
      const userId = payload.id;
      const user = await this.redisService.getCurrentUserCustomerFromRequest({
        userId,
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      request.user = {
        id: user.id,
        user_type: user.user_type,
        push_token: user?.push_token || null,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') || [];
    if (type && type.toLowerCase() === 'bearer' && token) return token;

    return undefined;
  }
}
