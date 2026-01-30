import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { EnvSchemaType } from '@app/shared/environment';
import { PrismaService } from '@app/shared';

const INNOVATE_CONNECT_AUDIENCE = 'INNOVATE_CONNECT';

type InnovateConnectJwtPayload = {
  sub: string;
  email: string;
  app: string;
  iat?: number;
  exp?: number;
};

@Injectable()
export class InnovateConnectAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvSchemaType>,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException('Token não fornecido');

    let payload: InnovateConnectJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<InnovateConnectJwtPayload>(token, {
        secret: this.config.getOrThrow('INNOVATE_CONNECT_JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    if (!payload?.sub || payload.app !== INNOVATE_CONNECT_AUDIENCE) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const admin = await this.prisma.innovateConnectAdmin.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, is_active: true },
    });

    if (!admin?.is_active) {
      throw new UnauthorizedException('Acesso não autorizado');
    }

    (request as any).innovateConnectAdmin = admin;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') || [];
    if (type?.toLowerCase() === 'bearer' && token) return token;
    return undefined;
  }
}
