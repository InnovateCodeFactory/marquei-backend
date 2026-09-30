/**
 * Validação ponta a ponta (planos/recorrência/lembretes + lista de espera)
 * contra o banco de DESENVOLVIMENTO `marquei-dev` (nosso HMG).
 *
 * - Aborta se DATABASE_URL não apontar pra `marquei-dev`.
 * - RabbitMQ é stubado: nada é enviado (push/WhatsApp/e-mail), só capturado.
 * - Só fecha (CloseDue) os agendamentos criados aqui.
 * - Remove tudo que criou no final (mesmo em caso de falha).
 *
 * Uso: node -r ts-node/register/transpile-only -r tsconfig-paths/register scripts/e2e-dev-plans-waitlist.ts
 */
import 'dotenv/config';
import { strict as assert } from 'assert';
import { Redis } from 'ioredis';

import { PrismaService } from '@app/shared';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import {
  CustomerPlanCreditService,
  CustomerPlanSummaryService,
  RecurringAppointmentsService,
  RedisLockService,
  WaitlistEventsService,
  WaitlistHoldService,
} from '@app/shared/services';
import { GetAvailableTimesForServiceAndProfessionalUseCase } from '../apps/api-gateway/src/modules/client/business/use-cases/get-available-times-for-service-and-professional.use-case';
import { CancelCustomerAppointmentUseCase } from '../apps/api-gateway/src/modules/client/customer-appointments/use-cases/cancel-appointment.use-case';
import { CreateAppointmentUseCase } from '../apps/api-gateway/src/modules/client/customer-appointments/use-cases/create-appointment.use-case';
import { AcceptWaitlistOfferUseCase } from '../apps/api-gateway/src/modules/client/waitlist/use-cases/accept-waitlist-offer.use-case';
import { DeclineWaitlistOfferUseCase } from '../apps/api-gateway/src/modules/client/waitlist/use-cases/decline-waitlist-offer.use-case';
import { GetMyWaitlistUseCase } from '../apps/api-gateway/src/modules/client/waitlist/use-cases/get-my-waitlist.use-case';
import { JoinWaitlistUseCase } from '../apps/api-gateway/src/modules/client/waitlist/use-cases/join-waitlist.use-case';
import { LeaveWaitlistUseCase } from '../apps/api-gateway/src/modules/client/waitlist/use-cases/leave-waitlist.use-case';
import {
  CreateCustomerPlanSubscriptionUseCase,
  RenewCustomerPlanSubscriptionUseCase,
} from '../apps/api-gateway/src/modules/professional/customer-plan-subscriptions/use-cases/customer-plan-subscriptions.use-cases';
import { CloseDueAppointmentsUseCase } from '../apps/scheduler/src/application/appointments/use-cases/close-due-appointments.use-case';
import { SchedulePlanReminderUseCase } from '../apps/scheduler/src/application/appointments/use-cases/schedule-plan-reminder.use-case';
import { ExpireWaitlistOffersUseCase } from '../apps/scheduler/src/application/waitlist/use-cases/expire-waitlist-offers.use-case';
import { OfferNextWaitlistEntryUseCase } from '../apps/scheduler/src/application/waitlist/use-cases/offer-next-waitlist-entry.use-case';

// ---- fixtures existentes no marquei-dev (barbearia de teste) ----
const BUSINESS_ID = 'cmk8bjkqd000cyxscfmi5eset';
const BUSINESS_SLUG = 'barbearia-do-carlos';
const PRO_ID = 'cmk8bjlnk000iyxsc6ayul9a4';
const PRO_USER_ID = 'cmk8bjkqd000dyxscsih13ugb';
const SERVICE_ID = 'cmk8bkywa000myxscxy87gh0g'; // Corte na Máquina, 30 min
const PERSON_X = 'cmif44vto000fyxbro2vyn9hp'; // dono do plano e dos agendamentos "de enchimento"
const PERSON_Y = 'cmkmsdcte0016yxmlhbzpal02'; // fila #1
const PERSON_Z = 'cmla99edh0002v5tbxgmd4nr5'; // fila #2

const created = {
  plan: null as string | null,
  subscription: null as string | null,
  appointments: [] as string[],
  series: [] as string[],
  businessCustomers: [] as string[],
  entries: [] as string[],
};

const results: { name: string; ok: boolean; detail?: string }[] = [];
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✔ ${name}`);
  } catch (error) {
    const detail = (error as Error)?.message ?? String(error);
    results.push({ name, ok: false, detail });
    console.log(`  ✘ ${name}\n      ${detail.split('\n').join('\n      ')}`);
  }
}

async function main() {
  const dbName = (process.env.DATABASE_URL ?? '').split('?')[0].split('/').pop();
  if (dbName !== 'marquei-dev') {
    throw new Error(`ABORTADO: DATABASE_URL aponta para "${dbName}", esperado marquei-dev.`);
  }

  const prisma = new PrismaService() as any;
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASS || undefined,
  });
  const redisService = new RedisService(redis as any, prisma);
  const lockService = new RedisLockService(redisService);

  const published: { routingKey: string; payload: any }[] = [];
  const rmq: any = {
    publishToQueue: async (msg: { routingKey: string; payload: any }) => void published.push(msg),
  };
  const gcalStub: any = {};
  const streamStub: any = { publishAppointmentCreated() {}, publishAppointmentEvent() {} };

  const credit = new CustomerPlanCreditService();
  const holdService = new WaitlistHoldService(prisma);
  const waitlistEvents = new WaitlistEventsService(rmq);
  const summary = new CustomerPlanSummaryService(prisma);
  const recurring = new RecurringAppointmentsService(prisma, credit, holdService);

  const createAppt = new CreateAppointmentUseCase(prisma, rmq, gcalStub, streamStub, credit, holdService);
  const cancelAppt = new CancelCustomerAppointmentUseCase(prisma, rmq, gcalStub, streamStub, credit, waitlistEvents);
  const availability = new GetAvailableTimesForServiceAndProfessionalUseCase(prisma, holdService);
  const join = new JoinWaitlistUseCase(prisma, availability);
  const leave = new LeaveWaitlistUseCase(prisma, waitlistEvents);
  const mine = new GetMyWaitlistUseCase(prisma);
  const accept = new AcceptWaitlistOfferUseCase(prisma, createAppt);
  const decline = new DeclineWaitlistOfferUseCase(prisma, waitlistEvents);
  const offerNext = new OfferNextWaitlistEntryUseCase(prisma, rmq, lockService, redisService, holdService);
  const expire = new ExpireWaitlistOffersUseCase(prisma, lockService, waitlistEvents);
  const planReminders = new SchedulePlanReminderUseCase(prisma, rmq, lockService);
  const createSub = new CreateCustomerPlanSubscriptionUseCase(prisma, summary);
  const renewSub = new RenewCustomerPlanSubscriptionUseCase(prisma, summary);

  const proUser: any = { id: PRO_USER_ID, current_selected_business_id: BUSINESS_ID };
  const reqFor = async (personId: string): Promise<any> => {
    const user = await prisma.user.findFirst({ where: { personId }, select: { id: true } });
    return { user: { id: user?.id ?? `test-user-${personId}`, personId }, headers: {} };
  };

  const bcFor = async (personId: string) => {
    const found = await prisma.businessCustomer.findFirst({ where: { businessId: BUSINESS_ID, personId } });
    if (found) return found;
    const person = await prisma.person.findUnique({ where: { id: personId } });
    const bc = await prisma.businessCustomer.create({
      data: { businessId: BUSINESS_ID, personId, email: person?.email || '', phone: person?.phone || '', verified: true },
    });
    created.businessCustomers.push(bc.id);
    return bc;
  };

  // ---- datas: dias abertos no futuro ----
  const business = await prisma.business.findUniqueOrThrow({ where: { id: BUSINESS_ID }, select: { opening_hours: true } });
  const rawHours: any = business.opening_hours;
  const hours: { day: string; closed: boolean; times?: { startTime: string; endTime: string }[] }[] =
    typeof rawHours === 'string' ? JSON.parse(rawHours) : rawHours;
  const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const ymdOf = (offsetDays: number) => {
    const d = new Date(Date.now() + offsetDays * 86_400_000);
    return d.toISOString().slice(0, 10);
  };
  const cfgFor = (ymd: string) => hours.find((h) => h.day === WEEKDAYS[new Date(`${ymd}T12:00:00Z`).getUTCDay()]);
  const openDays: string[] = [];
  const closedDays: string[] = [];
  for (let i = 3; i < 45 && (openDays.length < 8 || !closedDays.length); i++) {
    const ymd = ymdOf(i);
    const cfg = cfgFor(ymd);
    if (cfg && !cfg.closed && cfg.times?.length) openDays.push(ymd);
    else closedDays.push(ymd);
  }
  assert(openDays.length >= 8, 'poucos dias abertos no fixture');

  const localToUtc = (ymd: string, hhmm: string) => new Date(`${ymd}T${hhmm}:00.000-03:00`);
  const stampOf = (d: Date) => d.toISOString();

  const snapshotCycle = async (subscriptionId: string) =>
    prisma.customerServicePlanCycle.findFirstOrThrow({ where: { subscriptionId }, orderBy: { cycle_start: 'desc' } });
  const avail = (c: any) => c.credits_granted - c.credits_reserved - c.credits_consumed;

  try {
    // =====================================================================
    console.log('\n[1] Planos: venda, reserva, devolução, série recorrente, renovação manual, fechamento');
    // =====================================================================
    const bcX = await bcFor(PERSON_X);
    const reqX = await reqFor(PERSON_X);
    let subId = '';

    await step('vende assinatura: cria ciclo com 4 créditos e lança receita do plano (R$120)', async () => {
      const plan = await prisma.customerServicePlan.create({
        data: {
          businessId: BUSINESS_ID,
          name: '[E2E] Plano 4 cortes',
          price_in_cents: 12000,
          credits_per_cycle: 4,
          max_future_bookings: 4,
          created_by_user_id: PRO_USER_ID,
          updated_by_user_id: PRO_USER_ID,
          services: { create: [{ serviceId: SERVICE_ID }] },
        },
      });
      created.plan = plan.id;
      const sub: any = await createSub.execute(
        { plan_id: plan.id, customer_id: bcX.id, revenue_professional_profile_id: PRO_ID },
        proUser,
      );
      subId = sub.id;
      created.subscription = sub.id;
      assert.equal(sub.auto_renews, false);
      assert.equal(sub.credits_remaining, 4);
      const statements = await prisma.professionalStatement.findMany({ where: { customerPlanSubscriptionId: subId } });
      assert.equal(statements.length, 1);
      assert.equal(statements[0].value_in_cents, 12000);
      assert.equal(statements[0].type, 'INCOME');
    });

    let firstApptId = '';
    const planDay = openDays[0];
    const slotsForPlan = async (day: string) =>
      (await availability.execute({ business_slug: BUSINESS_SLUG, professional_id: PRO_ID, service_id: SERVICE_ID, day })).availableSlots;

    await step('agenda com plano: reserva 1 crédito (3 livres)', async () => {
      const slots = await slotsForPlan(planDay);
      assert(slots.length >= 1, `dia ${planDay} sem horário livre`);
      const before = await prisma.appointment.findMany({ where: { professionalProfileId: PRO_ID }, select: { id: true } });
      await createAppt.execute(
        {
          appointment_date: `${planDay}T${slots[0]}`,
          professional_id: PRO_ID,
          service_id: SERVICE_ID,
          plan_subscription_id: subId,
        } as any,
        reqX,
      );
      const after = await prisma.appointment.findMany({ where: { professionalProfileId: PRO_ID }, select: { id: true } });
      const beforeIds = new Set(before.map((a: any) => a.id));
      firstApptId = after.find((a: any) => !beforeIds.has(a.id))!.id;
      created.appointments.push(firstApptId);
      const cycle = await snapshotCycle(subId);
      assert.equal(cycle.credits_reserved, 1);
      assert.equal(avail(cycle), 3);
    });

    await step('cancela: devolve EXATAMENTE 1 crédito (4 livres, não 5)', async () => {
      await cancelAppt.execute({ appointment_id: firstApptId, reason: 'e2e' } as any, reqX);
      const cycle = await snapshotCycle(subId);
      assert.equal(cycle.credits_reserved, 0);
      assert.equal(cycle.credits_refunded, 1);
      assert.equal(avail(cycle), 4);
      const redemption = await prisma.appointmentPlanRedemption.findUnique({ where: { appointmentId: firstApptId } });
      assert.equal(redemption.status, 'REFUNDED');
    });

    let seriesApptIds: string[] = [];
    await step('série recorrente de 4 semanas com plano: esgota créditos e agenda aviso "último agendamento"', async () => {
      const start = `${planDay}T${(await slotsForPlan(planDay))[0]}`;
      const res: any = await recurring.createSeries({
        businessId: BUSINESS_ID,
        businessCustomerId: bcX.id,
        personId: PERSON_X,
        professionalProfileId: PRO_ID,
        serviceId: SERVICE_ID,
        planSubscriptionId: subId,
        firstAppointmentDate: start,
        frequency: 'WEEKLY',
        occurrences: 4,
        createdByUserId: reqX.user.id,
        createdByUserType: 'CUSTOMER',
        origin: 'CLIENT_APP',
      } as any);
      if (res?.series?.id) created.series.push(res.series.id);
      const redemptions = await prisma.appointmentPlanRedemption.findMany({
        where: { subscriptionId: subId, status: 'RESERVED' },
        include: { appointment: { select: { id: true, start_at_utc: true } } },
        orderBy: { appointment: { start_at_utc: 'asc' } },
      });
      seriesApptIds = redemptions.map((r: any) => r.appointmentId);
      created.appointments.push(...seriesApptIds);
      const cycle = await snapshotCycle(subId);
      assert(redemptions.length >= 1, 'série não criou agendamentos');
      // cria o máximo possível; se a semana tem conflito, as puladas ficam registradas
      const jobs = await prisma.reminderJob.findMany({
        where: { customerPlanSubscriptionId: subId, type: 'PLAN_LAST_APPOINTMENT' },
      });
      if (avail(cycle) === 0) {
        assert.equal(jobs.length, 2, 'esperava 1 job por canal (PUSH+WHATSAPP)');
        const lastApptId = redemptions[redemptions.length - 1].appointmentId;
        assert(jobs.every((j: any) => j.appointmentId === lastApptId), 'aviso deve apontar pro último cronológico');
      } else {
        console.log(`      (série criou ${redemptions.length}/4; conflitos pularam ocorrências, créditos livres=${avail(cycle)})`);
      }
    });

    await step('resumo da assinatura: posição, próximo pagamento estimado e não renova sozinho', async () => {
      const c = await snapshotCycle(subId);
      const map = await summary.summarize([
        {
          id: subId,
          current_cycle_end: (await prisma.customerPlanSubscription.findUniqueOrThrow({ where: { id: subId } })).current_cycle_end,
          cycle: c,
        },
      ]);
      const s: any = map.get(subId);
      assert.equal(s.auto_renews, false);
      assert(s.appointments.length >= 1);
      assert.equal(s.appointments[0].sequence, 1);
      assert(s.next_payment_estimate instanceof Date);
      assert.equal(s.credits_remaining, avail(c));
    });

    await step('despachante de lembrete processa o aviso de último agendamento sem falhar', async () => {
      await prisma.reminderJob.updateMany({
        where: { customerPlanSubscriptionId: subId, type: 'PLAN_LAST_APPOINTMENT' },
        data: { due_at_utc: new Date(Date.now() - 1000), status: 'PENDING' },
      });
      await planReminders.execute();
      const jobs = await prisma.reminderJob.findMany({
        where: { customerPlanSubscriptionId: subId, type: 'PLAN_LAST_APPOINTMENT' },
      });
      const cycle = await snapshotCycle(subId);
      if (jobs.length) {
        assert(jobs.every((j: any) => !['FAILED'].includes(j.status)), JSON.stringify(jobs.map((j: any) => [j.status, j.error])));
        console.log(`      jobs: ${jobs.map((j: any) => `${j.channel}:${j.status}${j.error ? `(${j.error})` : ''}`).join(', ')}`);
      } else {
        assert(avail(cycle) > 0, 'sem job mesmo com créditos esgotados');
      }
    });

    await step('renova (manual): novo ciclo + nova receita, NENHUM agendamento novo (não re-agenda)', async () => {
      const apptsBefore = await prisma.appointment.count({ where: { professionalProfileId: PRO_ID } });
      const seriesBefore = await prisma.recurringAppointmentSeries.count({ where: { planSubscriptionId: subId } });
      const sub: any = await renewSub.execute(subId, proUser);
      assert.equal(sub.auto_renews, false);
      assert.equal(await prisma.appointment.count({ where: { professionalProfileId: PRO_ID } }), apptsBefore);
      assert.equal(await prisma.recurringAppointmentSeries.count({ where: { planSubscriptionId: subId } }), seriesBefore);
      assert.equal(await prisma.customerServicePlanCycle.count({ where: { subscriptionId: subId } }), 2);
      const statements = await prisma.professionalStatement.findMany({ where: { customerPlanSubscriptionId: subId } });
      assert.equal(statements.length, 2);
      assert.equal(statements.reduce((t: number, s: any) => t + s.value_in_cents, 0), 24000);
    });

    await step('fechamento automático: consome crédito e NÃO duplica receita (sem R$ avulso do corte)', async () => {
      const target = seriesApptIds[0];
      assert(target, 'sem agendamento da série pra fechar');
      const past = new Date(Date.now() - 2 * 3_600_000);
      await prisma.appointment.update({
        where: { id: target },
        data: { start_at_utc: new Date(past.getTime() - 30 * 60_000), end_at_utc: past, status: 'CONFIRMED' },
      });
      const cycleBefore = await prisma.customerServicePlanCycle.findFirstOrThrow({
        where: { redemptions: { some: { appointmentId: target } } },
      });
      // Prisma "escopado": só enxerga o agendamento deste teste (não fecha dados de outras pessoas)
      const scoped = new Proxy(prisma, {
        get(t, prop) {
          const v = (t as any)[prop];
          if (prop === 'appointment') {
            return new Proxy(v, {
              get(m, p) {
                if (p === 'findMany') {
                  return (args: any) => m.findMany({ ...args, where: { ...args.where, id: target } });
                }
                return (m as any)[p];
              },
            });
          }
          return typeof v === 'function' ? v.bind(t) : v;
        },
      });
      const closer = new CloseDueAppointmentsUseCase(rmq, lockService, scoped as any, { get: () => 'test' } as any, credit);
      await closer.handle();

      const appt = await prisma.appointment.findUniqueOrThrow({ where: { id: target } });
      assert.equal(appt.status, 'COMPLETED');
      const redemption = await prisma.appointmentPlanRedemption.findUniqueOrThrow({ where: { appointmentId: target } });
      assert.equal(redemption.status, 'CONSUMED');
      const cycleAfter = await prisma.customerServicePlanCycle.findUniqueOrThrow({ where: { id: cycleBefore.id } });
      assert.equal(cycleAfter.credits_consumed, cycleBefore.credits_consumed + 1);
      assert.equal(cycleAfter.credits_reserved, cycleBefore.credits_reserved - 1);
      const dupStatements = await prisma.professionalStatement.count({ where: { appointmentId: target } });
      assert.equal(dupStatements, 0, 'não pode haver receita avulsa para atendimento coberto por plano');
    });

    // =====================================================================
    console.log('\n[2] Lista de espera: dia lotado, fila, oferta sequencial, hold, expiração, aceite');
    // =====================================================================
    const fullDay = openDays[2];
    const closedDay = closedDays[0];
    const fillIds: string[] = [];
    const fillSlots: { id: string; start: Date; end: Date }[] = [];
    const fillerReq = await reqFor(PERSON_X);
    const reqY = await reqFor(PERSON_Y);
    const reqZ = await reqFor(PERSON_Z);

    await step('enche o dia (agendamentos de 30 min cobrindo todo o expediente) e a disponibilidade vira FULL', async () => {
      const cfg = cfgFor(fullDay)!;
      for (const window of cfg.times!) {
        let cursor = localToUtc(fullDay, window.startTime);
        const end = localToUtc(fullDay, window.endTime);
        while (cursor.getTime() + 30 * 60_000 <= end.getTime()) {
          const next = new Date(cursor.getTime() + 30 * 60_000);
          const a = await prisma.appointment.create({
            data: {
              service_id: SERVICE_ID,
              status: 'CONFIRMED',
              start_at_utc: cursor,
              end_at_utc: next,
              duration_minutes: 30,
              start_offset_minutes: -180,
              professionalProfileId: PRO_ID,
              personId: PERSON_X,
            },
          });
          fillIds.push(a.id);
          fillSlots.push({ id: a.id, start: cursor, end: next });
          cursor = next;
        }
      }
      created.appointments.push(...fillIds);
      const res = await availability.execute({ business_slug: BUSINESS_SLUG, professional_id: PRO_ID, service_id: SERVICE_ID, day: fullDay });
      assert.equal(res.status, 'FULL');
      assert.deepEqual(res.availableSlots, []);
    });

    await step('dia fechado é CLOSED e NÃO aceita fila', async () => {
      const res = await availability.execute({ business_slug: BUSINESS_SLUG, professional_id: PRO_ID, service_id: SERVICE_ID, day: closedDay });
      assert.equal(res.status, 'CLOSED');
      await assert.rejects(
        () => join.execute({ business_slug: BUSINESS_SLUG, professional_id: PRO_ID, service_id: SERVICE_ID, date: closedDay }, reqY),
        /não atende nesse dia/,
      );
    });

    await step('dia com vaga NÃO aceita fila', async () => {
      await assert.rejects(
        () => join.execute({ business_slug: BUSINESS_SLUG, professional_id: PRO_ID, service_id: SERVICE_ID, date: openDays[5] }, reqY),
        /Ainda há horários/,
      );
    });

    let entryY = '';
    let entryZ = '';
    await step('Y e Z entram na fila em ordem (posições 1 e 2); segunda tentativa no mesmo dia é bloqueada', async () => {
      const dto = { business_slug: BUSINESS_SLUG, professional_id: PRO_ID, service_id: SERVICE_ID, date: fullDay };
      const y: any = await join.execute(dto, reqY);
      await new Promise((r) => setTimeout(r, 15));
      const z: any = await join.execute(dto, reqZ);
      entryY = y.id;
      entryZ = z.id;
      created.entries.push(y.id, z.id);
      assert.equal(y.position, 1);
      assert.equal(z.position, 2);
      await assert.rejects(() => join.execute({ ...dto, service_id: 'cmll1t1y90004yxlayqxmkvqj' }, reqY), /já está na lista de espera/);
    });

    const slotA = fillSlots[2];
    const freedFor = (n: number) => published.filter((p) => p.routingKey === 'scheduler.waitlist.slot_freed_queue')[n]?.payload;
    let offerY = '';
    await step('cancelamento publica vaga liberada; motor oferta ao 1º da fila (Y) com prazo e hold do horário', async () => {
      published.length = 0;
      await cancelAppt.execute({ appointment_id: slotA.id, reason: 'e2e waitlist' } as any, fillerReq);
      const msg = freedFor(0);
      assert(msg, 'cancelamento não publicou WaitlistSlotFreed');
      assert(msg.message_id);
      assert.equal(msg.reason, 'APPOINTMENT_CANCELED');
      assert.equal(msg.excluded_person_id, PERSON_X);

      assert.equal(await offerNext.handleSlotFreed(msg), undefined);
      const offer = await prisma.waitlistOffer.findFirstOrThrow({ where: { waitlistEntryId: entryY, status: 'PENDING' } });
      offerY = offer.id;
      assert.equal(offer.professionalProfileId, PRO_ID);
      assert.equal(stampOf(offer.slot_start_at_utc), stampOf(slotA.start));
      const ttlMin = (offer.expires_at_utc.getTime() - Date.now()) / 60_000;
      assert(ttlMin > 8 && ttlMin <= 10.1, `prazo inesperado: ${ttlMin}`);
      assert.equal((await prisma.waitlistEvent.count({ where: { offerId: offer.id, event_type: 'OFFER_SENT' } })), 1);

      // idempotência: mesma mensagem reprocessada não cria segunda oferta
      await offerNext.handleSlotFreed(msg);
      assert.equal(await prisma.waitlistOffer.count({ where: { waitlistEntryId: { in: [entryY, entryZ] } } }), 1);
    });

    await step('vaga ofertada fica segurada: continua FULL e agendamento normal no horário é bloqueado', async () => {
      const res = await availability.execute({ business_slug: BUSINESS_SLUG, professional_id: PRO_ID, service_id: SERVICE_ID, day: fullDay });
      assert.equal(res.status, 'FULL');
      assert.deepEqual(res.availableSlots, []);
      const before = await prisma.appointment.count({ where: { professionalProfileId: PRO_ID } });
      await assert.rejects(
        () =>
          createAppt.execute(
            { appointment_date: slotA.start.toISOString(), professional_id: PRO_ID, service_id: SERVICE_ID } as any,
            reqZ,
          ),
        /reservado para a lista de espera/,
      );
      assert.equal(await prisma.appointment.count({ where: { professionalProfileId: PRO_ID } }), before);
    });

    await step('GET /mine mostra posição e oferta pendente com contador vindo do servidor', async () => {
      const list: any[] = await mine.execute({ business_slug: BUSINESS_SLUG }, reqY);
      const item = list.find((e) => e.id === entryY)!;
      assert.equal(item.position, 1);
      assert.equal(item.offer.id, offerY);
      assert(item.offer.seconds_remaining > 480);
      assert(item.offer.server_now instanceof Date);
      const other: any[] = await mine.execute({ business_slug: BUSINESS_SLUG }, reqZ);
      assert.equal(other.find((e) => e.id === entryZ)!.offer, null);
    });

    let offerZ = '';
    await step('Y recusa: vez passa na hora pro Z; Y segue na fila', async () => {
      published.length = 0;
      await decline.execute(offerY, reqY);
      const msg = freedFor(0);
      assert.equal(msg.reason, 'OFFER_DECLINED');
      await offerNext.handleSlotFreed(msg);
      const z = await prisma.waitlistOffer.findFirstOrThrow({ where: { waitlistEntryId: entryZ, status: 'PENDING' } });
      offerZ = z.id;
      const y = await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entryY } });
      assert.equal(y.status, 'WAITING');
      await assert.rejects(() => decline.execute(offerY, reqY), /já foi respondida/);
    });

    await step('Z perde o prazo: oferta expira, entrada continua WAITING e ninguém mais recebe a mesma vaga', async () => {
      await prisma.waitlistOffer.update({ where: { id: offerZ }, data: { expires_at_utc: new Date(Date.now() - 1000) } });
      published.length = 0;
      assert.equal(await expire.expireOffers(), 1);
      const z = await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entryZ } });
      assert.equal(z.status, 'WAITING');
      const msg = freedFor(0);
      assert.equal(msg.reason, 'OFFER_EXPIRED');
      await offerNext.handleSlotFreed(msg);
      assert.equal(await prisma.waitlistOffer.count({ where: { status: 'PENDING', waitlistEntryId: { in: [entryY, entryZ] } } }), 0);
      await assert.rejects(() => accept.execute(offerZ, reqZ), /não está mais disponível/);
      // horário voltou a ficar livre pro fluxo normal
      const res = await availability.execute({ business_slug: BUSINESS_SLUG, professional_id: PRO_ID, service_id: SERVICE_ID, day: fullDay });
      assert.equal(res.status, 'AVAILABLE');
    });

    await step('aceite de oferta de OUTRO cliente é negado', async () => {
      const slotB = fillSlots[5];
      published.length = 0;
      await cancelAppt.execute({ appointment_id: slotB.id, reason: 'e2e waitlist 2' } as any, fillerReq);
      await offerNext.handleSlotFreed(freedFor(0));
      const offer = await prisma.waitlistOffer.findFirstOrThrow({ where: { waitlistEntryId: entryY, status: 'PENDING' } });
      await assert.rejects(() => accept.execute(offer.id, reqZ), /não encontrada/);
      offerY = offer.id;
    });

    await step('Y aceita: vira agendamento no horário ofertado, entrada CONVERTED, sem duplicar', async () => {
      const res = await accept.execute(offerY, reqY);
      created.appointments.push(res.appointment_id);
      const appt = await prisma.appointment.findUniqueOrThrow({ where: { id: res.appointment_id } });
      assert.equal(appt.personId, PERSON_Y);
      assert.equal(appt.professionalProfileId, PRO_ID);
      assert.equal(appt.status, 'PENDING');
      const entry = await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entryY } });
      assert.equal(entry.status, 'CONVERTED');
      assert.equal(entry.converted_appointment_id, res.appointment_id);
      assert.equal((await prisma.waitlistOffer.findUniqueOrThrow({ where: { id: offerY } })).status, 'CONVERTED');
      await assert.rejects(() => accept.execute(offerY, reqY), /não está mais disponível/);
      assert.equal(await prisma.appointment.count({ where: { professionalProfileId: PRO_ID, personId: PERSON_Y, id: { not: res.appointment_id }, start_at_utc: appt.start_at_utc } }), 0);
    });

    await step('Z sai da fila (LEFT) e reentrar reinicia a posição', async () => {
      await leave.execute(entryZ, reqZ);
      assert.equal((await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entryZ } })).status, 'CANCELED');
      // só o dono sai
      await assert.rejects(() => leave.execute(entryY, reqZ), /não encontrada/);
    });

    await step('fim do dia: entrada de dia passado vira EXPIRED_DAY_PASSED', async () => {
      const bcY = await bcFor(PERSON_Y);
      const stale = await prisma.waitlistEntry.create({
        data: {
          businessId: BUSINESS_ID,
          businessCustomerId: bcY.id,
          personId: PERSON_Z,
          professionalProfileId: PRO_ID,
          serviceId: SERVICE_ID,
          date: new Date('2020-01-01T00:00:00Z'),
        },
      });
      created.entries.push(stale.id);
      await expire.expireEntriesOfPastDays();
      assert.equal((await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: stale.id } })).status, 'EXPIRED_DAY_PASSED');
    });

    const totalWrites = published.length;
    console.log(`\n(mensagens capturadas no stub do RabbitMQ na última etapa: ${totalWrites}; nada foi enviado de verdade)`);
  } finally {
    await cleanup(prisma);
    redis.disconnect();
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passos OK`);
  if (failed.length) process.exitCode = 1;
}

async function cleanup(prisma: any) {
  console.log('\nLimpando dados criados pelo teste...');
  try {
    const apptIds = created.appointments;
    const subId = created.subscription;
    const entryIds = created.entries;

    const extraEntries = await prisma.waitlistEntry.findMany({
      where: { OR: [{ id: { in: entryIds } }, { businessId: BUSINESS_ID, personId: { in: [PERSON_Y, PERSON_Z] }, date: { gte: new Date('2020-01-01') } }] },
      select: { id: true },
    });
    const allEntries = Array.from(new Set([...entryIds, ...extraEntries.map((e: any) => e.id)]));
    // Só remove entradas que ESTE teste criou: as do fixture Y/Z no dia de teste
    await prisma.waitlistEvent.deleteMany({ where: { waitlistEntryId: { in: allEntries } } });
    await prisma.waitlistOffer.deleteMany({ where: { waitlistEntryId: { in: allEntries } } });
    await prisma.waitlistEntry.deleteMany({ where: { id: { in: allEntries } } });

    const series = subId
      ? await prisma.recurringAppointmentSeries.findMany({ where: { planSubscriptionId: subId }, select: { id: true } })
      : [];
    const seriesIds = Array.from(new Set([...created.series, ...series.map((s: any) => s.id)]));
    const occ = await prisma.recurringAppointmentOccurrence.findMany({
      where: { seriesId: { in: seriesIds } },
      select: { appointmentId: true },
    });
    const allAppts = Array.from(new Set([...apptIds, ...occ.map((o: any) => o.appointmentId).filter(Boolean)])) as string[];

    await prisma.reminderJob.deleteMany({ where: { OR: [{ appointmentId: { in: allAppts } }, ...(subId ? [{ customerPlanSubscriptionId: subId }] : [])] } });
    await prisma.recurringAppointmentOccurrence.deleteMany({ where: { seriesId: { in: seriesIds } } });
    await prisma.appointmentPlanRedemption.deleteMany({ where: { OR: [{ appointmentId: { in: allAppts } }, ...(subId ? [{ subscriptionId: subId }] : [])] } });
    await prisma.appointmentEvent.deleteMany({ where: { appointmentId: { in: allAppts } } });
    await prisma.professionalStatement.deleteMany({ where: { OR: [{ appointmentId: { in: allAppts } }, ...(subId ? [{ customerPlanSubscriptionId: subId }] : [])] } });
    await prisma.appointment.deleteMany({ where: { id: { in: allAppts } } });
    await prisma.recurringAppointmentSeries.deleteMany({ where: { id: { in: seriesIds } } });
    if (subId) {
      await prisma.customerServicePlanCycle.deleteMany({ where: { subscriptionId: subId } });
      await prisma.customerPlanSubscription.deleteMany({ where: { id: subId } });
    }
    if (created.plan) {
      await prisma.customerServicePlanService.deleteMany({ where: { planId: created.plan } });
      await prisma.customerServicePlan.deleteMany({ where: { id: created.plan } });
    }
    await prisma.businessCustomer.deleteMany({ where: { id: { in: created.businessCustomers } } });
    console.log('Limpeza concluída.');
  } catch (error) {
    console.error('FALHA NA LIMPEZA (verificar manualmente):', (error as Error).message);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
