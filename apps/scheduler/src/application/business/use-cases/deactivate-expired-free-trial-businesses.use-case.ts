import { PrismaService } from '@app/shared';
import { EnvSchemaType } from '@app/shared/environment';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisLockService } from 'apps/scheduler/src/infrastructure/locks/redis-lock.service';

const CRON_KEY = 'deactivate-expired-free-trial-businesses-cron';

@Injectable()
export class DeactivateExpiredFreeTrialBusinessesUseCase implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    DeactivateExpiredFreeTrialBusinessesUseCase.name,
  );

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisLockService: RedisLockService,
    private readonly configService: ConfigService<EnvSchemaType>,
  ) {}

  async onApplicationBootstrap() {
    // void this.handle();
  }

  // Executa a cada hora
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: CRON_KEY,
    timeZone: 'America/Sao_Paulo',
  })
  async execute() {
    if (this.configService.get('NODE_ENV') !== 'production') return;

    const lock = await this.redisLockService.tryAcquire({
      key: `lock:${CRON_KEY}`,
      ttlInSeconds: 10 * 60,
    });

    if (!lock) return;

    try {
      await this.handle();
    } finally {
      await lock.release();
    }
  }

  async handle() {
    const now = new Date();
    const BATCH_SIZE = 500;
    let cursor: string | null = null;
    let totalDeactivated = 0;

    while (true) {
      const businesses = await this.prismaService.business.findMany({
        where: {
          is_active: true,
          AND: [
            {
              BusinessSubscription: {
                some: {
                  plan: { billing_period: 'FREE_TRIAL' },
                  current_period_end: {
                    not: null,
                    lte: now,
                  },
                },
              },
            },
            {
              // Garante que o negócio só possui histórico de FREE_TRIAL (sem plano pago)
              BusinessSubscription: {
                none: {
                  plan: {
                    billing_period: { not: 'FREE_TRIAL' },
                  },
                },
              },
            },
            {
              // Evita desativar se houver qualquer assinatura ainda vigente
              BusinessSubscription: {
                none: {
                  status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
                  current_period_end: { gt: now },
                },
              },
            },
          ],
        },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
      });

      if (!businesses.length) break;

      const businessIds = businesses.map((business) => business.id);

      const updateResult = await this.prismaService.business.updateMany({
        where: {
          id: { in: businessIds },
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });

      totalDeactivated += updateResult.count;
      cursor = businesses[businesses.length - 1].id;

      if (businesses.length < BATCH_SIZE) break;
    }

    if (totalDeactivated > 0) {
      this.logger.log(
        `Negócios desativados por expiração de FREE_TRIAL: ${totalDeactivated}`,
      );
    }
  }
}
