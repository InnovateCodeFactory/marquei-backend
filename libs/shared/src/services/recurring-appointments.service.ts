import { PrismaService } from '@app/shared/modules/database/database.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, RecurringAppointmentFrequency, UserType } from '@prisma/client';
import { TZDate } from '@date-fns/tz';
import { addMinutes, addMonths, addWeeks, format } from 'date-fns';
import { CustomerPlanCreditService } from './customer-plan-credit.service';
import { WaitlistHoldService } from './waitlist-hold.service';

const BUSINESS_TZ_ID = 'America/Sao_Paulo';

type CreateRecurringAppointmentsParams = {
  businessId: string;
  businessCustomerId: string;
  personId: string;
  professionalProfileId: string;
  serviceId?: string;
  comboId?: string;
  planSubscriptionId?: string;
  firstAppointmentDate: string | Date;
  frequency?: RecurringAppointmentFrequency;
  occurrences: number;
  notes?: string;
  createdByUserId: string;
  createdByUserType: UserType;
  origin: 'CLIENT_APP' | 'PROFESSIONAL_APP';
};

type TargetAppointment = {
  serviceId: string;
  comboId: string | null;
  durationMinutes: number;
  comboSnapshot: Prisma.InputJsonValue | null;
};

@Injectable()
export class RecurringAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerPlanCreditService: CustomerPlanCreditService,
    private readonly waitlistHoldService: WaitlistHoldService,
  ) {}

  async createSeries(params: CreateRecurringAppointmentsParams) {
    this.validateOccurrenceCount(params.occurrences);

    const [professional, customer] = await Promise.all([
      this.prisma.professionalProfile.findFirst({
        where: {
          id: params.professionalProfileId,
          business_id: params.businessId,
        },
        select: { id: true, business_id: true },
      }),
      this.prisma.businessCustomer.findFirst({
        where: {
          id: params.businessCustomerId,
          businessId: params.businessId,
          personId: params.personId,
        },
        select: { id: true, personId: true },
      }),
    ]);

    if (!professional) {
      throw new BadRequestException('Profissional inválido para a recorrência.');
    }

    if (!customer) {
      throw new BadRequestException('Cliente inválido para a recorrência.');
    }

    const target = await this.resolveTargetAppointment(params);
    const planRules = await this.validatePlanPolicy(params, target);
    const occurrencesToCreate = Math.min(
      params.occurrences,
      planRules?.max_future_bookings ?? params.occurrences,
    );

    if (occurrencesToCreate < params.occurrences) {
      throw new BadRequestException(
        `Este plano permite deixar até ${occurrencesToCreate} agendamentos futuros.`,
      );
    }

    const startDates = this.buildOccurrenceDates({
      firstAppointmentDate: params.firstAppointmentDate,
      frequency: params.frequency ?? 'WEEKLY',
      occurrences: occurrencesToCreate,
    });
    const firstStart = startDates[0];
    const lastStart = startDates[startDates.length - 1];

    return this.prisma.$transaction(async (tx) => {
      const series = await tx.recurringAppointmentSeries.create({
        data: {
          businessId: params.businessId,
          businessCustomerId: params.businessCustomerId,
          personId: params.personId,
          professionalProfileId: params.professionalProfileId,
          serviceId: target.serviceId,
          serviceComboId: target.comboId,
          planSubscriptionId: params.planSubscriptionId || null,
          frequency: params.frequency ?? 'WEEKLY',
          weekday: firstStart.getDay(),
          day_of_month: firstStart.getDate(),
          time: format(firstStart, 'HH:mm'),
          timezone: BUSINESS_TZ_ID,
          starts_at: new Date(firstStart),
          max_occurrences: occurrencesToCreate,
          generated_until: new Date(lastStart),
          created_by_user_id: params.createdByUserId,
          created_by_user_type: params.createdByUserType,
        },
        select: { id: true },
      });

      let createdCount = 0;
      let skippedCount = 0;

      for (const startLocal of startDates) {
        const startUtc = new Date(startLocal);
        const endUtc = new Date(addMinutes(startLocal, target.durationMinutes));

        const conflict = await this.findConflict(tx, {
          businessId: params.businessId,
          professionalProfileId: params.professionalProfileId,
          startUtc,
          endUtc,
        });

        if (conflict) {
          skippedCount += 1;
          await tx.recurringAppointmentOccurrence.create({
            data: {
              seriesId: series.id,
              scheduled_start_at_utc: startUtc,
              status: 'SKIPPED_CONFLICT',
              reason: conflict,
            },
          });
          continue;
        }

        let preparedPlan: Awaited<
          ReturnType<CustomerPlanCreditService['prepareReservation']>
        > | null = null;
        if (params.planSubscriptionId) {
          try {
            preparedPlan =
              await this.customerPlanCreditService.prepareReservation({
                tx,
                subscriptionId: params.planSubscriptionId,
                businessId: params.businessId,
                personId: params.personId,
                serviceId: target.serviceId,
                comboId: target.comboId,
                appointmentStartUtc: startUtc,
              });
          } catch (error) {
            const issue = this.mapPlanIssueToOccurrence(error);
            if (issue) {
              skippedCount += 1;
              await tx.recurringAppointmentOccurrence.create({
                data: {
                  seriesId: series.id,
                  scheduled_start_at_utc: startUtc,
                  status: issue.status,
                  reason: issue.reason,
                },
              });
              continue;
            }
            throw error;
          }
        }

        const appointment = await tx.appointment.create({
          data: {
            start_at_utc: startUtc,
            end_at_utc: endUtc,
            duration_minutes: target.durationMinutes,
            timezone: BUSINESS_TZ_ID,
            professional: { connect: { id: params.professionalProfileId } },
            status: 'PENDING',
            service: { connect: { id: target.serviceId } },
            ...(target.comboId
              ? {
                  serviceCombo: { connect: { id: target.comboId } },
                  combo_snapshot: target.comboSnapshot,
                }
              : {}),
            notes: params.notes || null,
            customerPerson: { connect: { id: params.personId } },
            start_offset_minutes: startLocal.getTimezoneOffset(),
          },
          select: { id: true },
        });

        if (preparedPlan) {
          await this.customerPlanCreditService.reservePreparedCredit({
            tx,
            appointmentId: appointment.id,
            subscriptionId: preparedPlan.subscription.id,
            cycleId: preparedPlan.cycle.id,
            metadata: {
              origin: params.origin,
              recurring_series_id: series.id,
              service_id: target.serviceId,
              combo_id: target.comboId,
            },
          });
        }

        await tx.recurringAppointmentOccurrence.create({
          data: {
            seriesId: series.id,
            appointmentId: appointment.id,
            scheduled_start_at_utc: startUtc,
            status: 'CREATED',
          },
        });
        createdCount += 1;
      }

      return {
        id: series.id,
        created_appointments_count: createdCount,
        skipped_occurrences_count: skippedCount,
        generated_until: lastStart.toISOString(),
      };
    });
  }

  private async validatePlanPolicy(
    params: CreateRecurringAppointmentsParams,
    target: TargetAppointment,
  ) {
    if (!params.planSubscriptionId) return null;

    const subscription = await this.prisma.customerPlanSubscription.findFirst({
      where: {
        id: params.planSubscriptionId,
        businessId: params.businessId,
        businessCustomerId: params.businessCustomerId,
        personId: params.personId,
        status: 'ACTIVE',
      },
      select: {
        rules_snapshot: true,
        plan: {
          select: {
            allow_client_recurring_booking: true,
            services: { select: { serviceId: true } },
            combos: { select: { serviceComboId: true } },
          },
        },
      },
    });

    if (!subscription) {
      throw new BadRequestException('Plano do cliente inválido ou inativo.');
    }

    if (!subscription.plan.allow_client_recurring_booking) {
      throw new BadRequestException(
        'Este plano não permite agendamento recorrente pelo cliente.',
      );
    }

    const serviceAllowed = subscription.plan.services.some(
      (item) => item.serviceId === target.serviceId,
    );
    const comboAllowed = target.comboId
      ? subscription.plan.combos.some(
          (item) => item.serviceComboId === target.comboId,
        )
      : false;

    if (!serviceAllowed && !comboAllowed) {
      throw new BadRequestException(
        'Este plano não cobre o serviço selecionado.',
      );
    }

    const rules =
      subscription.rules_snapshot &&
      typeof subscription.rules_snapshot === 'object'
        ? (subscription.rules_snapshot as Record<string, unknown>)
        : {};

    return {
      max_future_bookings: this.toPositiveInt(rules.max_future_bookings, 1),
    };
  }

  private async resolveTargetAppointment(
    params: CreateRecurringAppointmentsParams,
  ): Promise<TargetAppointment> {
    const hasServiceId = Boolean(params.serviceId?.trim());
    const hasComboId = Boolean(params.comboId?.trim());

    if (!hasServiceId && !hasComboId) {
      throw new BadRequestException(
        'Informe service_id ou combo_id para criar a recorrência.',
      );
    }

    if (hasServiceId && hasComboId) {
      throw new BadRequestException(
        'Informe apenas um entre service_id ou combo_id.',
      );
    }

    if (hasServiceId) {
      const [service, executesService] = await Promise.all([
        this.prisma.service.findFirst({
          where: {
            id: params.serviceId,
            businessId: params.businessId,
            is_active: true,
          },
          select: { id: true, duration: true },
        }),
        this.prisma.professionalService.count({
          where: {
            professional_profile_id: params.professionalProfileId,
            service_id: params.serviceId,
            active: true,
          },
        }),
      ]);

      if (!service) {
        throw new BadRequestException('Serviço inválido para a recorrência.');
      }

      if (executesService < 1) {
        throw new BadRequestException(
          'Este profissional não executa o serviço selecionado.',
        );
      }

      if (!service.duration || service.duration <= 0) {
        throw new BadRequestException('Duração do serviço inválida.');
      }

      return {
        serviceId: service.id,
        comboId: null,
        durationMinutes: service.duration,
        comboSnapshot: null,
      };
    }

    const [combo, executesCombo] = await Promise.all([
      this.prisma.serviceCombo.findFirst({
        where: {
          id: params.comboId,
          businessId: params.businessId,
          is_active: true,
          deleted_at: null,
        },
        select: {
          id: true,
          name: true,
          final_duration_minutes: true,
          final_price_in_cents: true,
          items: {
            orderBy: { sort_order: 'asc' },
            select: {
              serviceId: true,
              price_in_cents_snapshot: true,
              duration_minutes_snapshot: true,
              sort_order: true,
              service: {
                select: {
                  id: true,
                  name: true,
                  is_active: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.professionalServiceCombo.count({
        where: {
          professional_profile_id: params.professionalProfileId,
          service_combo_id: params.comboId,
          active: true,
        },
      }),
    ]);

    if (!combo) {
      throw new BadRequestException('Combo inválido para a recorrência.');
    }

    if (executesCombo < 1) {
      throw new BadRequestException(
        'Este profissional não executa o combo selecionado.',
      );
    }

    const anchorService = combo.items.find((item) => item.service?.is_active);
    if (!anchorService) {
      throw new BadRequestException(
        'Combo sem serviços ativos para criar recorrência.',
      );
    }

    return {
      serviceId: anchorService.serviceId,
      comboId: combo.id,
      durationMinutes: combo.final_duration_minutes,
      comboSnapshot: {
        combo_id: combo.id,
        combo_name: combo.name,
        final_price_in_cents: combo.final_price_in_cents,
        final_duration_minutes: combo.final_duration_minutes,
        services: combo.items.map((item) => ({
          service_id: item.serviceId,
          service_name: item.service?.name ?? 'Serviço',
          sort_order: item.sort_order,
          price_in_cents_snapshot: item.price_in_cents_snapshot,
          duration_minutes_snapshot: item.duration_minutes_snapshot,
        })),
      },
    };
  }

  private async findConflict(
    tx: any,
    params: {
      businessId: string;
      professionalProfileId: string;
      startUtc: Date;
      endUtc: Date;
    },
  ) {
    const appointment = await tx.appointment.findFirst({
      where: {
        professionalProfileId: params.professionalProfileId,
        start_at_utc: { lt: params.endUtc },
        end_at_utc: { gt: params.startUtc },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { id: true },
    });

    if (appointment) return 'Horário ocupado na agenda do profissional.';

    const block = await tx.professionalTimesBlock.findFirst({
      where: {
        professionalProfileId: params.professionalProfileId,
        businessId: params.businessId,
        start_at_utc: { lt: params.endUtc },
        end_at_utc: { gt: params.startUtc },
      },
      select: { id: true },
    });

    if (block) return 'Horário bloqueado na agenda do profissional.';

    const hold = await this.waitlistHoldService.findBlockingHold(
      {
        professionalProfileId: params.professionalProfileId,
        startUtc: params.startUtc,
        endUtc: params.endUtc,
      },
      tx,
    );

    return hold ? 'Horário reservado para a lista de espera.' : null;
  }

  private buildOccurrenceDates({
    firstAppointmentDate,
    frequency,
    occurrences,
  }: {
    firstAppointmentDate: string | Date;
    frequency: RecurringAppointmentFrequency;
    occurrences: number;
  }) {
    const first = this.toTZDateLocal(firstAppointmentDate);
    return Array.from({ length: occurrences }, (_, index) => {
      if (frequency === 'BIWEEKLY') return addWeeks(first, index * 2) as TZDate;
      if (frequency === 'MONTHLY') return addMonths(first, index) as TZDate;
      return addWeeks(first, index) as TZDate;
    });
  }

  private validateOccurrenceCount(value: number) {
    if (!Number.isInteger(value) || value < 1 || value > 12) {
      throw new BadRequestException(
        'Informe entre 1 e 12 ocorrências para a recorrência.',
      );
    }
  }

  private toPositiveInt(value: unknown, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.floor(parsed);
  }

  private mapPlanIssueToOccurrence(error: unknown):
    | {
        status: 'SKIPPED_NO_CREDIT' | 'SKIPPED_OUT_OF_CYCLE';
        reason: string;
      }
    | null {
    if (!(error instanceof BadRequestException)) return null;
    const message = error.message || 'Não foi possível reservar crédito do plano.';

    if (message.includes('Ciclo do plano não encontrado')) {
      return { status: 'SKIPPED_OUT_OF_CYCLE', reason: message };
    }

    if (
      message.includes('não possui créditos') ||
      message.includes('limite de uso nesta semana') ||
      message.includes('intervalo maior entre usos')
    ) {
      return { status: 'SKIPPED_NO_CREDIT', reason: message };
    }

    return null;
  }

  private toTZDateLocal(input: Date | string): TZDate {
    if (input instanceof Date) {
      return new TZDate(input, BUSINESS_TZ_ID);
    }

    const iso = input.replace(' ', 'T');
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ]?(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      iso,
    );

    if (!m) {
      const date = new Date(input);
      if (isNaN(date.getTime())) {
        throw new BadRequestException(
          'Formato de data/hora inválido para first_appointment_date.',
        );
      }
      return new TZDate(date, BUSINESS_TZ_ID);
    }

    const [, y, mo, d, hh, mm, ss] = m.map(Number) as unknown as number[];
    return new TZDate(y, mo - 1, d, hh, mm, ss || 0, BUSINESS_TZ_ID);
  }
}
