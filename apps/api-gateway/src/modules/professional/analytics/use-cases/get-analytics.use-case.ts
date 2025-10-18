import { PrismaService } from '@app/shared';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { AppRequest } from '@app/shared/types/app-request';
import { CachedKeys } from '@app/shared/utils/cached-keys';
import { Price } from '@app/shared/value-objects';
import { Injectable } from '@nestjs/common';
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GetAnalyticsDto } from '../dto/requests/get-analytics.dto';

type Granularity = 'day' | 'two_days' | 'week' | 'month';
type SeriesPoint = { label: string; value: number; value_formatted: string };
type SeriesPayload = { granularity: Granularity; points: SeriesPoint[] };

@Injectable()
export class ProfessionalAnalyticsUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async execute(dto: GetAnalyticsDto, req: AppRequest) {
    const { start_date, end_date } = dto;

    const businessSlug = req.user?.current_selected_business_slug;
    const businessId = req.user?.current_selected_business_id;

    if (!businessSlug || !businessId) {
      return { metricCards: [] as any[], revenueSeries: null as any };
    }

    const cachedKey = CachedKeys.PROFESSIONAL_ANALYTICS({
      business_slug: businessSlug,
      end_date,
      start_date,
    });

    const cached = await this.getFromCache({ key: cachedKey });
    if (cached) return cached;

    // Intervalo atual e anterior
    // Parse das datas no timezone local (evita problema de UTC)
    // Formato esperado: YYYY-MM-DD (ex: 2025-10-17)
    const [startYear, startMonth, startDay] = start_date.split('-').map(Number);
    const [endYear, endMonth, endDay] = end_date.split('-').map(Number);

    const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const endDateDt = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    const rangeMs = endDateDt.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - rangeMs);

    // Consultas paralelas
    const [
      newCustomersNow,
      newCustomersPrev,
      incomeNowAgg,
      incomePrevAgg,
      completedNow,
      completedPrev,
    ] = await Promise.all([
      this.prismaService.businessCustomer.count({
        where: { businessId, created_at: { gte: startDate, lte: endDateDt } },
      }),
      this.prismaService.businessCustomer.count({
        where: {
          businessId,
          created_at: { gte: prevStartDate, lte: prevEndDate },
        },
      }),
      this.prismaService.professionalStatement.aggregate({
        where: {
          businessId,
          type: 'INCOME',
          created_at: { gte: startDate, lte: endDateDt },
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
      this.prismaService.appointment.count({
        where: {
          status: 'COMPLETED',
          professional: { business_id: businessId },
          start_at_utc: { gte: startDate, lte: endDateDt },
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

    // Normalizações
    const incomeNowCents = toNumber(incomeNowAgg._sum.value_in_cents ?? 0);
    const incomePrevCents = toNumber(incomePrevAgg._sum.value_in_cents ?? 0);
    const ticketNowCents = completedNow
      ? Math.floor(incomeNowCents / completedNow)
      : 0;
    const ticketPrevCents = completedPrev
      ? Math.floor(incomePrevCents / completedPrev)
      : 0;

    // Cards
    const metricCards = [
      this.makeNumberCard('Novos clientes', newCustomersNow, newCustomersPrev),
      this.makeMoneyCard('Receita', incomeNowCents, incomePrevCents),
      this.makeNumberCard('Atendimentos', completedNow, completedPrev),
      this.makeMoneyCard('Ticket médio', ticketNowCents, ticketPrevCents),
    ];

    // Série (labels pequenos em pt-BR, como antes)
    const revenueSeries = await this.getRevenueSeries({
      businessId,
      startDate,
      endDate: endDateDt,
    });

    const payload = { metricCards, revenueSeries };
    // await this.setToCache({ key: cachedKey, data: payload });
    return payload;
  }

  // Helpers de métricas
  private makeNumberCard(title: string, now: number, prev: number) {
    const delta = now - prev;
    const pctChange = this.percentChange(now, prev);

    // Se houver queda (delta negativo), mostrar 0 ao invés de valores negativos
    const shouldShowZero = delta < 0;

    return {
      title,
      value: this.formatCompactNumber(now),
      totalIncreaseOrDecrease: this.formatSignedNumber(
        shouldShowZero ? 0 : delta,
      ),
      totalIncreaseOrDecreasePercentage: this.formatSignedPercent(
        shouldShowZero ? 0 : pctChange,
      ),
    };
  }

  private makeMoneyCard(title: string, nowCents: number, prevCents: number) {
    const delta = nowCents - prevCents;
    const pctChange = this.percentChange(nowCents, prevCents);

    // Se houver queda (delta negativo), mostrar 0 ao invés de valores negativos
    const shouldShowZero = delta < 0;

    const obj = {
      title,
      value: new Price(nowCents).toCurrency(),
      totalIncreaseOrDecrease: this.formatSignedCurrency(
        shouldShowZero ? 0 : delta,
      ),
      totalIncreaseOrDecreasePercentage: this.formatSignedPercent(
        shouldShowZero ? 0 : pctChange,
      ),
    };

    return obj;
  }

  // Cache
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

  // Formatação numérica
  private formatCompactNumber(value: number): string {
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

  private formatSignedNumber(delta: number): string {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toLocaleString('pt-BR')}`;
  }

  private formatSignedCurrency(deltaCents: number): string {
    const sign = deltaCents > 0 ? '+' : deltaCents < 0 ? '-' : '';
    const abs = Math.abs(deltaCents);
    return `${sign}${new Price(abs).toCurrency()}`;
  }

  private percentChange(now: number, prev: number): number {
    if (!prev) return now ? 100 : 0;
    return Math.round(((now - prev) / prev) * 100);
  }

  private formatSignedPercent(pct: number): string {
    return `${pct > 0 ? '+' : ''}${pct}%`;
  }

  // Série de Receita
  private async getRevenueSeries({
    businessId,
    startDate,
    endDate,
  }: {
    businessId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<SeriesPayload> {
    const days = differenceInCalendarDays(endDate, startDate) + 1;

    if (days <= 8) {
      // dd-dd/LLL (ex: 10-11/out)
      return this.buildSeriesBuckets({
        businessId,
        startDate,
        endDate,
        stepSql: '2 days',
        granularity: 'two_days',
        labelForBucketStart: (d) => {
          const start = d;
          const end = addDays(d, 1);
          // Formato compacto: dd-dd/LLL quando no mesmo mês
          if (start.getMonth() === end.getMonth()) {
            return `${format(start, 'dd', { locale: ptBR })}-${format(end, 'dd/LLL', { locale: ptBR })}`;
          }
          // Se mudar de mês, mostrar ambos os meses
          return `${format(start, 'dd/LLL', { locale: ptBR })}-${format(end, 'dd/LLL', { locale: ptBR })}`;
        },
      });
    }

    if (days <= 16) {
      // dd/LLL - dd/LLL
      return this.buildSeriesBuckets({
        businessId,
        startDate,
        endDate,
        stepSql: '2 days',
        granularity: 'two_days',
        labelForBucketStart: (d) => {
          const start = d;
          const end = addDays(d, 1);
          return `${format(start, 'dd/LLL', { locale: ptBR })} - ${format(end, 'dd/LLL', { locale: ptBR })}`;
        },
      });
    }

    if (days <= 31) {
      // dd/LLL - dd/LLL (semana de 7 dias)
      return this.buildSeriesBuckets({
        businessId,
        startDate,
        endDate,
        stepSql: '7 days',
        granularity: 'week',
        labelForBucketStart: (d) => {
          const start = d;
          const end = addDays(d, 6);
          return `${format(start, 'dd/LLL', { locale: ptBR })} - ${format(end, 'dd/LLL', { locale: ptBR })}`;
        },
      });
    }

    // LLL/yyyy (ex: out/2025) - usado para 60 dias
    return this.buildSeriesMonthly({ businessId, startDate, endDate });
  }

  // Buckets 1/2/7 dias
  private async buildSeriesBuckets(params: {
    businessId: string;
    startDate: Date;
    endDate: Date;
    stepSql: '1 day' | '2 days' | '7 days';
    granularity: Exclude<Granularity, 'month'>;
    labelForBucketStart: (bucketStart: Date) => string;
  }): Promise<SeriesPayload> {
    const {
      businessId,
      startDate,
      endDate,
      stepSql,
      granularity,
      labelForBucketStart,
    } = params;

    // Converter datas para strings no formato que o PostgreSQL entende
    const startDateStr = format(startDate, 'yyyy-MM-dd HH:mm:ss');
    const endDateStr = format(endDate, 'yyyy-MM-dd HH:mm:ss');

    const rows = (await this.prismaService.$queryRawUnsafe<any[]>(
      `
      with buckets as (
        select generate_series(
          ($1 || ' America/Sao_Paulo')::timestamptz,
          ($2 || ' America/Sao_Paulo')::timestamptz,
          interval '${stepSql}'
        ) as bucket_start
      )
      select
        b.bucket_start as bucket_start,
        coalesce(sum(s.value_in_cents), 0) as revenue_cents
      from buckets b
      left join "ProfessionalStatement" s
        on s."businessId" = $3
       and s.type = 'INCOME'
       and s.created_at >= b.bucket_start
       and s.created_at < LEAST(
         b.bucket_start + interval '${stepSql}',
         ($2 || ' America/Sao_Paulo')::timestamptz + interval '1 millisecond'
       )
      group by 1
      order by 1 asc
      `,
      startDateStr,
      endDateStr,
      businessId,
    )) as { bucket_start: Date; revenue_cents: unknown }[];

    const points: SeriesPoint[] = rows.map((r) => {
      const cents = toNumber(r.revenue_cents ?? 0);
      const value = cents / 100;

      // Usar a data retornada do banco diretamente (já está no timezone correto)
      const bucketDate = new Date(r.bucket_start);

      return {
        label: labelForBucketStart(bucketDate),
        value,
        value_formatted: `R$${this.formatCompactNumber(value)}`, // mantendo como estava (sem espaço)
      };
    });

    return { granularity, points };
  }

  // Série mensal
  private async buildSeriesMonthly(params: {
    businessId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<SeriesPayload> {
    const { businessId, startDate, endDate } = params;

    // Usar strings de data no formato ISO para evitar problemas de timezone
    // Formato: YYYY-MM-DD (PostgreSQL vai interpretar no timezone do servidor)
    const startMonthStr = format(startOfMonth(startDate), 'yyyy-MM-dd');
    const endMonthStr = format(endOfMonth(endDate), 'yyyy-MM-dd');

    const rows = (await this.prismaService.$queryRawUnsafe<any[]>(
      `
      with buckets as (
        select gs::date as bucket_start
        from generate_series(
          date_trunc('month', $1::date),
          date_trunc('month', $2::date),
          interval '1 month'
        ) as gs
      )
      select
        b.bucket_start as bucket_start,
        coalesce(sum(s.value_in_cents), 0) as revenue_cents
      from buckets b
      left join "ProfessionalStatement" s
        on s."businessId" = $3
       and s.type = 'INCOME'
       and date_trunc('month', s.created_at AT TIME ZONE 'America/Sao_Paulo')::date = b.bucket_start
      group by 1
      order by 1 asc
      `,
      startMonthStr,
      endMonthStr,
      businessId,
    )) as { bucket_start: Date; revenue_cents: unknown }[];

    const points: SeriesPoint[] = rows.map((r) => {
      const cents = toNumber(r.revenue_cents ?? 0);
      const value = cents / 100;

      // Parse da data como UTC para evitar conversão de timezone
      const bucketDate = new Date(r.bucket_start);
      // Extrair ano e mês diretamente da string/objeto
      const year = bucketDate.getUTCFullYear();
      const month = bucketDate.getUTCMonth(); // 0-11

      // Criar data no timezone local para formatação correta
      const localDate = new Date(year, month, 1);
      const label = format(localDate, 'LLL/yyyy', { locale: ptBR });

      return {
        label, // ex: out/2025
        value,
        value_formatted: `R$${this.formatCompactNumber(value)}`, // mantendo como estava
      };
    });

    return { granularity: 'month', points };
  }
}

// Utilidades
function toNumber(n: unknown): number {
  if (typeof n === 'bigint') return Number(n);
  if (typeof n === 'number') return n;
  if (typeof n === 'string') return Number(n);
  return 0;
}
