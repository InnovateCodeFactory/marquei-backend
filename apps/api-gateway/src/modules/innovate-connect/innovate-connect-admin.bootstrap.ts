import { PrismaService } from '@app/shared';
import { EnvSchemaType } from '@app/shared/environment';
import { HashingService } from '@app/shared/services';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InnovateConnectAdminBootstrap implements OnModuleInit {
  private readonly logger = new Logger(InnovateConnectAdminBootstrap.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvSchemaType>,
    private readonly hashing: HashingService,
  ) {}

  private getAllowedEmails(): string[] {
    return (this.config.get('INNOVATE_CONNECT_ALLOWED_EMAILS') || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }

  async onModuleInit() {
    const emails = this.getAllowedEmails();
    if (!emails.length) return;

    const passwordHash = await this.hashing.hash('@Carlana2708');

    const result = await this.prisma.innovateConnectAdmin.createMany({
      data: emails.map((email) => ({
        email,
        password_hash: passwordHash,
        is_active: true,
      })),
      skipDuplicates: true,
    });

    if (result.count > 0) {
      this.logger.warn(
        `Innovate Connect admins bootstrap: ${result.count} novo(s). Troque a senha padrão imediatamente.`,
      );
    }
  }
}
