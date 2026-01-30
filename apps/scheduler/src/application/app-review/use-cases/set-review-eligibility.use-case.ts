import { PrismaService } from '@app/shared';
import { EnvSchemaType } from '@app/shared/environment';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { RedisLockService } from 'apps/scheduler/src/infrastructure/locks/redis-lock.service';

@Injectable()
export class SetReviewEligibilityUseCase implements OnApplicationBootstrap {
  private readonly logger = new Logger(SetReviewEligibilityUseCase.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisLockService: RedisLockService,
    private readonly configService: ConfigService<EnvSchemaType>,
  ) {}

  async onApplicationBootstrap() {
    // void this.handle();
  }

  // Executa diariamente às 03:30
  @Cron('30 3 * * *')
  async execute() {
    if (this.configService.get('NODE_ENV') !== 'production') return;

    const lock = await this.redisLockService.tryAcquire({
      key: 'lock:review-eligibility',
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
    const MIN_COMPLETED = 3;

    const completedByProfessional =
      await this.prismaService.appointment.groupBy({
        by: ['professionalProfileId'],
        where: {
          status: 'COMPLETED',
          professionalProfileId: { not: null },
        },
        _count: { _all: true },
      });

    const professionalProfileIds = completedByProfessional
      .filter((row) => row._count._all >= MIN_COMPLETED)
      .map((row) => row.professionalProfileId)
      .filter((id): id is string => Boolean(id));

    if (!professionalProfileIds.length) return;

    const professionals = await this.prismaService.professionalProfile.findMany(
      {
        where: {
          id: { in: professionalProfileIds },
          userId: { not: null },
        },
        select: { userId: true },
      },
    );

    const userIds = professionals
      .map((prof) => prof.userId)
      .filter((id): id is string => Boolean(id));

    if (!userIds.length) return;

    const result = await this.prismaService.user.updateMany({
      where: {
        id: { in: userIds },
        app_review_eligible: false,
      },
      data: { app_review_eligible: true },
    });

    this.logger.log(
      `Review eligibility updated for ${result.count} professional(s).`,
    );
  }
}
