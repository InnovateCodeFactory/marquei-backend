import { BadRequestException, Injectable } from '@nestjs/common';
import { BusinessReminderType, Prisma } from '@prisma/client';
import { addDays, endOfWeek, startOfWeek, subDays } from 'date-fns';
import { BUSINESS_REMINDER_TYPE_DEFAULTS } from '../utils/business-notification-templates';
import { getAvailableCredits } from '../utils/customer-plan-summary';

type Tx = any;

type PrepareReservationParams = {
  tx: Tx;
  subscriptionId: string;
  businessId: string;
  personId: string;
  serviceId: string;
  comboId?: string | null;
  appointmentStartUtc: Date;
};

type ReservePreparedCreditParams = {
  tx: Tx;
  appointmentId: string;
  subscriptionId: string;
  cycleId: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class CustomerPlanCreditService {
  availableCredits(cycle: {
    credits_granted: number;
    credits_reserved: number;
    credits_consumed: number;
    credits_refunded: number;
  }) {
    return getAvailableCredits(cycle);
  }

  async prepareReservation({
    tx,
    subscriptionId,
    businessId,
    personId,
    serviceId,
    comboId,
    appointmentStartUtc,
  }: PrepareReservationParams) {
    const subscription = await tx.customerPlanSubscription.findFirst({
      where: {
        id: subscriptionId,
        businessId,
        personId,
        status: 'ACTIVE',
        current_cycle_start: { lte: appointmentStartUtc },
        current_cycle_end: { gte: appointmentStartUtc },
      },
      select: {
        id: true,
        businessId: true,
        businessCustomerId: true,
        current_cycle_start: true,
        current_cycle_end: true,
        rules_snapshot: true,
        plan: {
          select: {
            id: true,
            status: true,
            services: { select: { serviceId: true } },
            combos: { select: { serviceComboId: true } },
          },
        },
      },
    });

    if (!subscription || subscription.plan.status !== 'ACTIVE') {
      throw new BadRequestException('Plano do cliente inválido ou inativo.');
    }

    const serviceAllowed = subscription.plan.services.some(
      (item) => item.serviceId === serviceId,
    );
    const comboAllowed = comboId
      ? subscription.plan.combos.some((item) => item.serviceComboId === comboId)
      : false;

    if (!serviceAllowed && !comboAllowed) {
      throw new BadRequestException(
        'Este plano não cobre o serviço selecionado.',
      );
    }

    const cycle = await tx.customerServicePlanCycle.findFirst({
      where: {
        subscriptionId,
        cycle_start: { lte: appointmentStartUtc },
        cycle_end: { gte: appointmentStartUtc },
      },
      orderBy: { cycle_start: 'desc' },
      select: {
        id: true,
        credits_granted: true,
        credits_reserved: true,
        credits_consumed: true,
        credits_refunded: true,
      },
    });

    if (!cycle) {
      throw new BadRequestException('Ciclo do plano não encontrado.');
    }

    if (this.availableCredits(cycle) <= 0) {
      throw new BadRequestException('Este plano não possui créditos disponíveis.');
    }

    const rules = this.normalizeRules(subscription.rules_snapshot);
    await this.validateWeeklyLimit({
      tx,
      subscriptionId,
      appointmentStartUtc,
      maxUsesPerWeek: rules.max_uses_per_week,
      allowMultipleUsesSameWeek: rules.allow_multiple_uses_same_week,
    });

    if (rules.min_days_between_uses > 0) {
      await this.validateMinimumGap({
        tx,
        subscriptionId,
        appointmentStartUtc,
        minDaysBetweenUses: rules.min_days_between_uses,
      });
    }

    return {
      subscription,
      cycle,
      rules,
    };
  }

  async reservePreparedCredit({
    tx,
    appointmentId,
    subscriptionId,
    cycleId,
    metadata,
  }: ReservePreparedCreditParams) {
    const updated = await tx.$executeRaw`
      UPDATE "CustomerServicePlanCycle"
      SET "credits_reserved" = "credits_reserved" + 1,
          "updated_at" = NOW()
      WHERE "id" = ${cycleId}
        AND ("credits_granted" - "credits_reserved" - "credits_consumed") > 0
    `;

    if (Number(updated) !== 1) {
      throw new BadRequestException('Este plano não possui créditos disponíveis.');
    }

    await tx.appointmentPlanRedemption.create({
      data: {
        appointmentId,
        subscriptionId,
        cycleId,
        status: 'RESERVED',
        metadata: metadata ?? Prisma.JsonNull,
      },
    });

    await this.syncLastAppointmentReminder({ tx, subscriptionId, cycleId });
  }

  /**
   * Quando a reserva esgota os créditos do ciclo, agenda o aviso "este é o
   * último agendamento do plano" (assinatura não renova sozinha) no
   * agendamento cronologicamente mais tardio ainda ativo do ciclo.
   * Idempotente por (assinatura, ciclo, tipo, canal): nunca reenvia um aviso
   * já enviado; se o "último" mudou (remarcação/cancelamento), reaponta o job.
   */
  private async syncLastAppointmentReminder({
    tx,
    subscriptionId,
    cycleId,
  }: {
    tx: Tx;
    subscriptionId: string;
    cycleId: string;
  }) {
    const type = BusinessReminderType.PLAN_LAST_APPOINTMENT;
    const cycle = await tx.customerServicePlanCycle.findUnique({
      where: { id: cycleId },
      select: {
        credits_granted: true,
        credits_reserved: true,
        credits_consumed: true,
        credits_refunded: true,
        subscription: { select: { businessId: true, personId: true } },
      },
    });
    if (!cycle || this.availableCredits(cycle) !== 0) return;

    const last = await tx.appointmentPlanRedemption.findFirst({
      where: {
        cycleId,
        status: 'RESERVED',
        appointment: { status: { in: ['PENDING', 'CONFIRMED'] } },
      },
      orderBy: { appointment: { start_at_utc: 'desc' } },
      select: { appointmentId: true, appointment: { select: { start_at_utc: true } } },
    });
    if (!last) return;

    const settings = await tx.businessReminderSettings.findFirst({
      where: { businessId: cycle.subscription.businessId, type },
      select: { is_active: true, channels: true, offsets_min_before: true },
    });
    const defaults = BUSINESS_REMINDER_TYPE_DEFAULTS[type];
    if (settings && !settings.is_active) return;

    const channels = settings?.channels?.length
      ? settings.channels
      : defaults.channels;
    const offsets = settings?.offsets_min_before?.length
      ? settings.offsets_min_before
      : defaults.offsets_min_before;
    const offsetMin = Math.max(...offsets);

    const start = last.appointment.start_at_utc as Date;
    const now = new Date();
    if (start.getTime() <= now.getTime()) return;
    // Se já estamos dentro da janela do aviso, envia em 1 minuto.
    const due = new Date(
      Math.max(start.getTime() - offsetMin * 60_000, now.getTime() + 60_000),
    );
    if (due.getTime() >= start.getTime()) return;

    for (const channel of channels) {
      const where = {
        customerPlanSubscriptionId: subscriptionId,
        cycleId,
        type,
        channel,
      };
      await tx.reminderJob.upsert({
        where: { uq_job_plan_cycle_type_channel: where },
        create: {
          ...where,
          businessId: cycle.subscription.businessId,
          personId: cycle.subscription.personId,
          appointmentId: last.appointmentId,
          due_at_utc: due,
        },
        update: {},
      });
      // Reaponta jobs ainda não enviados para o "último" atual.
      await tx.reminderJob.updateMany({
        where: { ...where, status: { not: 'SENT' } },
        data: {
          appointmentId: last.appointmentId,
          due_at_utc: due,
          status: 'PENDING',
          error: null,
          attempts: 0,
        },
      });
    }
  }

  async consumeReservedCredit(tx: Tx, redemptionId: string) {
    const redemption = await tx.appointmentPlanRedemption.findFirst({
      where: { id: redemptionId, status: 'RESERVED' },
      select: { id: true, cycleId: true },
    });

    if (!redemption) return false;

    await tx.customerServicePlanCycle.update({
      where: { id: redemption.cycleId },
      data: {
        credits_reserved: { decrement: 1 },
        credits_consumed: { increment: 1 },
      },
    });

    await tx.appointmentPlanRedemption.update({
      where: { id: redemption.id },
      data: { status: 'CONSUMED', consumed_at: new Date() },
    });

    return true;
  }

  async refundReservedCredit(tx: Tx, appointmentId: string) {
    const redemption = await tx.appointmentPlanRedemption.findFirst({
      where: { appointmentId, status: 'RESERVED' },
      select: { id: true, cycleId: true },
    });

    if (!redemption) return false;

    await tx.customerServicePlanCycle.update({
      where: { id: redemption.cycleId },
      data: {
        credits_reserved: { decrement: 1 },
        credits_refunded: { increment: 1 },
      },
    });

    await tx.appointmentPlanRedemption.update({
      where: { id: redemption.id },
      data: { status: 'REFUNDED', refunded_at: new Date() },
    });

    return true;
  }

  private normalizeRules(raw: Prisma.JsonValue) {
    const rules = (raw && typeof raw === 'object' ? raw : {}) as Record<
      string,
      unknown
    >;

    return {
      max_uses_per_week: this.toPositiveInt(rules.max_uses_per_week, 1),
      allow_multiple_uses_same_week:
        rules.allow_multiple_uses_same_week === true,
      min_days_between_uses: this.toPositiveInt(
        rules.min_days_between_uses,
        0,
      ),
    };
  }

  private toPositiveInt(value: unknown, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.floor(parsed);
  }

  private async validateWeeklyLimit({
    tx,
    subscriptionId,
    appointmentStartUtc,
    maxUsesPerWeek,
    allowMultipleUsesSameWeek,
  }: {
    tx: Tx;
    subscriptionId: string;
    appointmentStartUtc: Date;
    maxUsesPerWeek: number;
    allowMultipleUsesSameWeek: boolean;
  }) {
    if (allowMultipleUsesSameWeek) return;

    const weekStart = startOfWeek(appointmentStartUtc, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(appointmentStartUtc, { weekStartsOn: 1 });

    const usedInWeek = await tx.appointmentPlanRedemption.count({
      where: {
        subscriptionId,
        status: { in: ['RESERVED', 'CONSUMED'] },
        appointment: {
          start_at_utc: { gte: weekStart, lte: weekEnd },
          status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
        },
      },
    });

    if (usedInWeek >= Math.max(1, maxUsesPerWeek)) {
      throw new BadRequestException(
        'Este plano já atingiu o limite de uso nesta semana.',
      );
    }
  }

  private async validateMinimumGap({
    tx,
    subscriptionId,
    appointmentStartUtc,
    minDaysBetweenUses,
  }: {
    tx: Tx;
    subscriptionId: string;
    appointmentStartUtc: Date;
    minDaysBetweenUses: number;
  }) {
    const from = subDays(appointmentStartUtc, minDaysBetweenUses);
    const to = addDays(appointmentStartUtc, minDaysBetweenUses);

    const nearby = await tx.appointmentPlanRedemption.findFirst({
      where: {
        subscriptionId,
        status: { in: ['RESERVED', 'CONSUMED'] },
        appointment: {
          start_at_utc: { gte: from, lte: to },
          status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
        },
      },
      select: { id: true },
    });

    if (nearby) {
      throw new BadRequestException(
        'Este plano exige um intervalo maior entre usos.',
      );
    }
  }
}
