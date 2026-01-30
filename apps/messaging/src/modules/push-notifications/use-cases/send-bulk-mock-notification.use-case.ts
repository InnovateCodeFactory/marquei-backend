import { PrismaService } from '@app/shared';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PushNotificationsBaseService } from '../push-notifications-base.service';

type TargetUserType = 'CUSTOMER' | 'PROFESSIONAL';

@Injectable()
export class SendBulkMockNotificationUseCase implements OnApplicationBootstrap {
  private readonly logger = new Logger(SendBulkMockNotificationUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushNotificationsBaseService: PushNotificationsBaseService,
  ) {}

  async onApplicationBootstrap() {
    // if (!this.isEnabled()) return;
    // try {
    //   await this.execute();
    // } catch (error) {
    //   this.logger.error(
    //     `Erro ao executar envio em massa: ${error.message}`,
    //     error.stack,
    //   );
    // }
  }

  private isEnabled() {
    return String(process.env.MOCK_BULK_PUSH_ENABLED || '').toLowerCase() ===
      'true'
      ? true
      : false;
  }

  private resolveTarget(): TargetUserType | null {
    const raw = String(process.env.MOCK_BULK_PUSH_TARGET || '').toUpperCase();
    if (raw === 'CUSTOMER' || raw === 'PROFESSIONAL') return raw;
    return null;
  }

  async execute() {
    const target = this.resolveTarget() || 'PROFESSIONAL';
    if (!target) {
      this.logger.warn(
        'MOCK_BULK_PUSH_TARGET inválido. Use CUSTOMER ou PROFESSIONAL.',
      );
      return;
    }

    const title = 'Nova atualização disponível ✅';
    const body = 'Atualize o app para garantir uma experiência estável.';

    const users = await this.prisma.user.findMany({
      where: {
        user_type: target,
        push_token: { not: null },
      },
      select: { push_token: true },
    });

    const tokens = Array.from(
      new Set(users.map((u) => u.push_token).filter(Boolean)) as Set<string>,
    );

    if (!tokens.length) {
      this.logger.warn(
        `Nenhum token encontrado para ${target}. Nada a enviar.`,
      );
      return;
    }

    this.logger.log(
      `Enviando mock push para ${tokens.length} usuários (${target}).`,
    );

    const report = await this.pushNotificationsBaseService.sendToMultipleTokens(
      {
        common: { title, body },
        tokens,
        options: {
          verbose: true,
          dryRun: false,
        },
      },
    );

    this.logger.log(
      `Mock push finalizado. Enfileiradas: ${report.enqueued}/${report.requested}. Tokens inválidos: ${report.invalidTokens.length}.`,
    );
  }
}
