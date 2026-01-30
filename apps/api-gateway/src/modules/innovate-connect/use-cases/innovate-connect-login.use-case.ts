import { PrismaService } from '@app/shared';
import { EnvSchemaType } from '@app/shared/environment';
import { HashingService } from '@app/shared/services';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InnovateConnectLoginDto } from '../dto/requests/innovate-connect-login.dto';

const INNOVATE_CONNECT_AUDIENCE = 'INNOVATE_CONNECT';

@Injectable()
export class InnovateConnectLoginUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvSchemaType>,
  ) {}

  private getAllowedEmails(): string[] {
    const raw = this.config.get('INNOVATE_CONNECT_ALLOWED_EMAILS') || '';
    return raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }

  async execute({ email, password }: InnovateConnectLoginDto) {
    const normalizedEmail = email.trim().toLowerCase();
    const allowed = this.getAllowedEmails();

    if (!allowed.length || !allowed.includes(normalizedEmail)) {
      throw new UnauthorizedException('Acesso não autorizado');
    }

    const admin = await this.prisma.innovateConnectAdmin.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        password_hash: true,
        is_active: true,
      },
    });

    if (!admin?.is_active) {
      throw new UnauthorizedException('Acesso não autorizado');
    }

    const isValid = await this.hashing.compare(password, admin.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Acesso não autorizado');
    }

    const expiresIn = this.config.get('INNOVATE_CONNECT_JWT_EXPIRES_IN')?.trim() || '7d';
    const token = await this.jwtService.signAsync(
      {
        sub: admin.id,
        email: admin.email,
        app: INNOVATE_CONNECT_AUDIENCE,
      },
      {
        secret: this.config.getOrThrow('INNOVATE_CONNECT_JWT_SECRET'),
        expiresIn,
      },
    );

    await this.prisma.innovateConnectAdmin.update({
      where: { id: admin.id },
      data: { last_login_at: new Date() },
    });

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn,
      admin: {
        id: admin.id,
        email: admin.email,
      },
    };
  }
}
