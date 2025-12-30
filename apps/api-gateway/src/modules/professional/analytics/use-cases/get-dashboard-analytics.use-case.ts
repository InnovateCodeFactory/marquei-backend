import { PrismaService } from '@app/shared';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { AppRequest } from '@app/shared/types/app-request';
import { CachedKeys } from '@app/shared/utils/cached-keys';
import { Price } from '@app/shared/value-objects';
import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { GetAnalyticsDto } from '../dto/requests/get-analytics.dto';

type SummaryCard = {
  id: 'revenue' | 'appointments' | 'customers' | 'ticket';
  label: string;
  value: string;
  changePct: number;
  changeValue: string;
};

type LineSeriesPayload = {
  total: number;
  totalFormatted: string;
  labels: string[];
  series: number[];
};

type DashboardAnalyticsPayload = {
  summaryCards: SummaryCard[];
  quickCharts: {
    appointments: LineSeriesPayload;
    customers: LineSeriesPayload;
  };
  revenueChart: {
    total: string;
    labels: string[];
    series: number[];
  };
  appointmentsChart: {
    labels: string[];
    series: { name: string; data: number[] }[];
  };
};

@Injectable()
export class ProfessionalDashboardAnalyticsUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async execute(dto: GetAnalyticsDto, req: AppRequest) {
    const { start_date, end_date } = dto;
    const businessSlug = req.user?.current_selected_business_slug;
    const businessId = req.user?.current_selected_business_id;

    if (!businessSlug || !businessId) {
      return {
        summaryCards: [],
        quickCharts: { appointments: emptyLine(), customers: emptyLine() },
        revenueChart: { total: 'R$0', labels: [], series: [] },
        appointmentsChart: { labels: [], series: [] },
      } as DashboardAnalyticsPayload;
    }

    const cachedKey = CachedKeys.PROFESSIONAL_DASHBOARD_ANALYTICS({
      business_slug: businessSlug,
      end_date,
      start_date,
    });
    const cached = await this.getFromCache({ key: cachedKey });
    if (cached) return cached;

    const { startDate, endDate } = parseLocalRange(start_date, end_date);
    const { prevStartDate, prevEndDate } = getPreviousRange(startDate, endDate);

    const [
      revenueNowAgg,
      revenuePrevAgg,
      customersNow,
      customersPrev,
      completedNow,
      completedPrev,
    ] = await Promise.all([
      this.prismaService.professionalStatement.aggregate({
        where: {
          businessId,
          type: 'INCOME',
          created_at: { gte: startDate, lte: endDate },
        },
        _sum: { value_in_cents: true },
      }),
      this.prismaService.professionalStatement.aggregate({
        where: {
          businessId,
          type: 'INCOME',
          created_at: { gte: prevStartDate, lte: prevEndDate },
        },
        _sum: { value_in_cents: true },
      }),
      this.prismaService.businessCustomer.count({
        where: { businessId, created_at: { gte: startDate, lte: endDate } },
      }),
      this.prismaService.businessCustomer.count({
        where: {
          businessId,
          created_at: { gte: prevStartDate, lte: prevEndDate },
        },
      }),
      this.prismaService.appointment.count({
        where: {
          status: 'COMPLETED',
          professional: { business_id: businessId },
          start_at_utc: { gte: startDate, lte: endDate },
        },
      }),
      this.prismaService.appointment.count({
        where: {
          status: 'COMPLETED',
          professional: { business_id: businessId },
          start_at_utc: { gte: prevStartDate, lte: prevEndDate },
        },
      }),
    ]);

    const revenueNowCents = toNumber(revenueNowAgg._sum.value_in_cents ?? 0);
    const revenuePrevCents = toNumber(revenuePrevAgg._sum.value_in_cents ?? 0);
    const ticketNowCents = completedNow
      ? Math.floor(revenueNowCents / completedNow)
      : 0;
    const ticketPrevCents = completedPrev
      ? Math.floor(revenuePrevCents / completedPrev)
      : 0;

    const [revenueSeries, customersSeries, appointmentSeries] =
      await Promise.all([
        this.getRevenueSeries({ startDate, endDate, businessId }),
        this.getCustomersSeries({ startDate, endDate, businessId }),
        this.getAppointmentsSeries({ startDate, endDate, businessId }),
      ]);

    const summaryCards: SummaryCard[] = [
      makeMoneyCard({
        id: 'revenue',
        label: 'Receita',
        now: revenueNowCents,
        prev: revenuePrevCents,
      }),
      makeNumberCard({
        id: 'appointments',
        label: 'Atendimentos',
        now: completedNow,
        prev: completedPrev,
      }),
      makeNumberCard({
        id: 'customers',
        label: 'Novos clientes',
        now: customersNow,
        prev: customersPrev,
      }),
      makeMoneyCard({
        id: 'ticket',
        label: 'Ticket médio',
        now: ticketNowCents,
        prev: ticketPrevCents,
      }),
    ];

    const appointmentsQuick: LineSeriesPayload = {
      total: appointmentSeries.completedTotal,
      totalFormatted: formatCompactNumber(appointmentSeries.completedTotal),
      labels: appointmentSeries.labels,
      series: appointmentSeries.completedSeries,
    };

    const customersQuick: LineSeriesPayload = {
      total: customersSeries.total,
      totalFormatted: formatCompactNumber(customersSeries.total),
      labels: customersSeries.labels,
      series: customersSeries.series,
    };

    const payload: DashboardAnalyticsPayload = {
      summaryCards,
      quickCharts: {
        appointments: appointmentsQuick,
        customers: customersQuick,
      },
      revenueChart: {
        total: new Price(revenueNowCents).toCurrency(),
        labels: revenueSeries.labels,
        series: revenueSeries.series,
      },
      appointmentsChart: {
        labels: appointmentSeries.labels,
        series: [
          { name: 'Atendimentos', data: appointmentSeries.completedSeries },
          { name: 'Cancelamentos', data: appointmentSeries.canceledSeries },
        ],
      },
    };

    await this.setToCache({ key: cachedKey, data: payload });

    return payload;
  }

  private async getRevenueSeries(params: {
    startDate: Date;
    endDate: Date;
    businessId: string;
  }) {
    const { startDate, endDate, businessId } = params;
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    const rows = (await this.prismaService.$queryRawUnsafe<any[]>(
      `
      with days as (
        select generate_series($1::date, $2::date, interval '1 day')::date as day
      )
      select
        d.day as day,
        coalesce(sum(s.value_in_cents), 0) as revenue_cents
      from days d
      left join "ProfessionalStatement" s
        on s."businessId" = $3
       and s.type = 'INCOME'
       and (s.created_at at time zone 'America/Sao_Paulo')::date = d.day
      group by d.day
      order by d.day asc
      `,
      startDateStr,
      endDateStr,
      businessId,
    )) as { day: Date; revenue_cents: unknown }[];

    const labels = rows.map((row) => format(new Date(row.day), 'yyyy-MM-dd'));
    const series = rows.map((row) => toNumber(row.revenue_cents ?? 0) / 100);

    return { labels, series };
  }

  private async getCustomersSeries(params: {
    startDate: Date;
    endDate: Date;
    businessId: string;
  }) {
    const { startDate, endDate, businessId } = params;
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    const rows = (await this.prismaService.$queryRawUnsafe<any[]>(
      `
      with days as (
        select generate_series($1::date, $2::date, interval '1 day')::date as day
      )
      select
        d.day as day,
        coalesce(count(bc.id), 0) as total
      from days d
      left join "BusinessCustomer" bc
        on bc."businessId" = $3
       and (bc.created_at at time zone 'America/Sao_Paulo')::date = d.day
      group by d.day
      order by d.day asc
      `,
      startDateStr,
      endDateStr,
      businessId,
    )) as { day: Date; total: unknown }[];

    const labels = rows.map((row) => format(new Date(row.day), 'yyyy-MM-dd'));
    const series = rows.map((row) => toNumber(row.total ?? 0));
    const total = series.reduce((sum, value) => sum + value, 0);

    return { labels, series, total };
  }

  private async getAppointmentsSeries(params: {
    startDate: Date;
    endDate: Date;
    businessId: string;
  }) {
    const { startDate, endDate, businessId } = params;
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    const rows = (await this.prismaService.$queryRawUnsafe<any[]>(
      `
      with days as (
        select generate_series($1::date, $2::date, interval '1 day')::date as day
      )
      select
        d.day as day,
        coalesce(sum(case when a.status = 'COMPLETED' then 1 else 0 end), 0) as completed,
        coalesce(sum(case when a.status = 'CANCELED' then 1 else 0 end), 0) as canceled
      from days d
      left join "Appointment" a
        on (a.start_at_utc at time zone 'America/Sao_Paulo')::date = d.day
       and a."professionalProfileId" in (
          select id from "ProfessionalProfile" where business_id = $3
       )
      group by d.day
      order by d.day asc
      `,
      startDateStr,
      endDateStr,
      businessId,
    )) as { day: Date; completed: unknown; canceled: unknown }[];

    const labels = rows.map((row) => format(new Date(row.day), 'yyyy-MM-dd'));
    const completedSeries = rows.map((row) =>
      toNumber(row.completed ?? 0),
    );
    const canceledSeries = rows.map((row) => toNumber(row.canceled ?? 0));
    const completedTotal = completedSeries.reduce(
      (sum, value) => sum + value,
      0,
    );

    return {
      labels,
      completedSeries,
      canceledSeries,
      completedTotal,
    };
  }

  private async getFromCache({ key }: { key: string }) {
    const cachedData = await this.redisService.get({ key });
    return cachedData ? JSON.parse(cachedData) : null;
  }

  private async setToCache({ key, data }: { key: string; data: any }) {
    await this.redisService.set({
      key,
      value: JSON.stringify(data),
      ttlInSeconds: 300,
    });
  }
}

function parseLocalRange(start: string, end: string) {
  const [startYear, startMonth, startDay] = start.split('-').map(Number);
  const [endYear, endMonth, endDay] = end.split('-').map(Number);

  const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
  const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

  return { startDate, endDate };
}

function getPreviousRange(startDate: Date, endDate: Date) {
  const rangeMs = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime() - 1);
  const prevStartDate = new Date(prevEndDate.getTime() - rangeMs);
  return { prevStartDate, prevEndDate };
}

function makeNumberCard(params: {
  id: SummaryCard['id'];
  label: string;
  now: number;
  prev: number;
}): SummaryCard {
  const { id, label, now, prev } = params;
  const delta = now - prev;
  const pctChange = percentChange(now, prev);

  return {
    id,
    label,
    value: formatCompactNumber(now),
    changePct: pctChange,
    changeValue: formatSignedNumber(delta),
  };
}

function makeMoneyCard(params: {
  id: SummaryCard['id'];
  label: string;
  now: number;
  prev: number;
}): SummaryCard {
  const { id, label, now, prev } = params;
  const delta = now - prev;
  const pctChange = percentChange(now, prev);
  return {
    id,
    label,
    value: new Price(now).toCurrency(),
    changePct: pctChange,
    changeValue: formatSignedCurrency(delta),
  };
}

function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs < 1000) return `${sign}${abs.toLocaleString('pt-BR')}`;
  if (abs < 1_000_000) {
    const v = (abs / 1000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${sign}${v}k`;
  }
  if (abs < 1_000_000_000) {
    const v = (abs / 1_000_000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${sign}${v}M`;
  }
  const v = (abs / 1_000_000_000).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${sign}${v}B`;
}

function formatSignedNumber(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toLocaleString('pt-BR')}`;
}

function formatSignedCurrency(deltaCents: number): string {
  const sign = deltaCents > 0 ? '+' : deltaCents < 0 ? '-' : '';
  const abs = Math.abs(deltaCents);
  return `${sign}${new Price(abs).toCurrency()}`;
}

function percentChange(now: number, prev: number): number {
  if (!prev) return now ? 100 : 0;
  return Math.round(((now - prev) / prev) * 100);
}

function toNumber(n: unknown): number {
  if (typeof n === 'bigint') return Number(n);
  if (typeof n === 'number') return n;
  if (typeof n === 'string') return Number(n);
  return 0;
}

function emptyLine(): LineSeriesPayload {
  return { total: 0, totalFormatted: '0', labels: [], series: [] };
}
