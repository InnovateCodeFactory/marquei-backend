import { PrismaService } from '@app/shared';
import { EnvSchemaType } from '@app/shared/environment';
import { SCHEDULER_QUEUES } from '@app/shared/modules/rmq/constants';
import {
  RABBIT_EXCHANGE,
  RmqService,
} from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { RedisLockService } from 'apps/scheduler/src/infrastructure/locks/redis-lock.service';

@Injectable()
export class CloseDueAppointmentsUseCase implements OnApplicationBootstrap {
  private readonly logger = new Logger(CloseDueAppointmentsUseCase.name);
  constructor(
    private readonly rmqService: RmqService,
    private readonly redisLockService: RedisLockService,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService<EnvSchemaType>,
  ) {}

  async onApplicationBootstrap() {
    // await this.execute();
  }

  @Cron('*/5 * * * *') // a cada 5 minutos
  async execute() {
    if (this.configService.get('NODE_ENV') !== 'production') return;

    const lock = await this.redisLockService.tryAcquire({
      key: 'lock:close-due',
      ttlInSeconds: 4 * 60, // 4 minutos
    });

    if (!lock) return; // já tem outro worker rodando

    try {
      await this.rmqService.publishToQueue({
        routingKey: SCHEDULER_QUEUES.APPOINTMENTS.CLOSE_DUE_APPOINTMENTS_QUEUE,
        payload: {},
      });
    } finally {
      await lock.release();
    }
  }

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    routingKey: SCHEDULER_QUEUES.APPOINTMENTS.CLOSE_DUE_APPOINTMENTS_QUEUE,
    queue: SCHEDULER_QUEUES.APPOINTMENTS.CLOSE_DUE_APPOINTMENTS_QUEUE,
  })
  async handle() {
    try {
      // Sempre UTC
      const nowUtc = new Date();

      // (Opcional) Grace period para evitar borda em relógios/latência de fila
      const GRACE_MIN = 3;
      const cutoff = new Date(nowUtc.getTime() - GRACE_MIN * 60_000);

      const BATCH = 500;
      let cursor: string | null = null;

      while (true) {
        const rows = await this.prismaService.appointment.findMany({
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            end_at_utc: { lt: cutoff }, // << comparação em UTC pura
          },
          select: {
            id: true,
            personId: true,
            professional: {
              select: {
                id: true,
                business_id: true,
              },
            },
            serviceComboId: true,
            service: {
              select: {
                price_in_cents: true,
                name: true,
              },
            },
            serviceCombo: {
              select: {
                id: true,
                name: true,
                final_price_in_cents: true,
                items: {
                  orderBy: { sort_order: 'asc' },
                  select: {
                    serviceId: true,
                    sort_order: true,
                    duration_minutes_snapshot: true,
                    price_in_cents_snapshot: true,
                    service: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { end_at_utc: 'asc' },
          take: BATCH,
          ...(cursor && { skip: 1, cursor: { id: cursor } }),
        });

        if (!rows.length) break;

        await this.prismaService.$transaction(async (tx) => {
          await tx.appointment.updateMany({
            where: {
              id: { in: rows.map((r) => r.id) },
              status: { in: ['PENDING', 'CONFIRMED'] },
              end_at_utc: { lt: cutoff },
            },
            data: { status: 'COMPLETED' },
          });

          await tx.appointmentEvent.createMany({
            data: rows.map((r) => ({
              appointmentId: r.id,
              event_type: 'COMPLETED_AUTO',
              by_professional: false,
              by_user_id: null,
              reason: 'auto-close',
              ip: null,
              user_agent: null,
            })),
            skipDuplicates: true,
          });

          await tx.professionalStatement.createMany({
            data: rows.map((r) => ({
              appointmentId: r.id,
              businessId: r.professional.business_id,
              professionalProfileId: r.professional.id,
              type: 'INCOME',
              value_in_cents:
                r.serviceCombo?.final_price_in_cents ?? r.service.price_in_cents,
              description: r.serviceCombo
                ? `Combo: ${r.serviceCombo.name}`
                : r.service.name,
              is_combo: !!r.serviceCombo,
              serviceComboId: r.serviceCombo?.id ?? null,
              combo_services_snapshot: r.serviceCombo
                ? {
                    combo_id: r.serviceCombo.id,
                    combo_name: r.serviceCombo.name,
                    services: r.serviceCombo.items.map((item) => ({
                      service_id: item.serviceId,
                      name: item.service.name,
                      sort_order: item.sort_order,
                      duration_minutes_snapshot: item.duration_minutes_snapshot,
                      price_in_cents_snapshot: item.price_in_cents_snapshot,
                    })),
                  }
                : null,
            })),
          });
        });

        cursor = rows[rows.length - 1].id;
        if (rows.length < BATCH) break;
      }
    } catch (error) {
      this.logger.error('Erro ao fechar agendamentos', error);
    }
  }
}
