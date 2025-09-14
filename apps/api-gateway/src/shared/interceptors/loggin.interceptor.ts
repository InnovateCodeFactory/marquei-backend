import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { Observable, finalize, tap } from 'rxjs';
import { LOGGING_QUEUE } from '../services';

const REDACT_KEYS = [
  'password',
  'senha',
  'secret',
  'token',
  'authorization',
  'access_token',
  'refresh_token',
  'newPassword',
  'new_password',
  'code',
  'otp',
  'pin',
  'cvv',
  'cardNumber',
  'card_number',
  'cardNum',
  'card_num',
  'ssn',
  'socialSecurityNumber',
  'social_security_number',
];

const EXCLUDED_ENDPOINTS = [
  '/health',
  '/metrics',
  '/api/client/business/nearby',
  '/api/client/auth/refresh',
];

function redact(obj: any, depth = 0): any {
  if (!obj || typeof obj !== 'object' || depth > 4) return obj;
  if (Array.isArray(obj)) return obj.map((v) => redact(v, depth + 1));

  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (REDACT_KEYS.includes(k.toLowerCase())) return [k, '[PROTECTED]'];
      if (typeof v === 'object') return [k, redact(v, depth + 1)];
      return [k, v];
    }),
  );
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly rmqService: RmqService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    if (ctx.getType() !== 'http') {
      return next.handle();
    }

    const http = ctx.switchToHttp();
    const req = http.getRequest<AppRequest>();
    const res: any = http.getResponse();

    const method = (req.method || '').toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    const endpoint = (req as any).originalUrl || (req as any).url || '';

    if (endpoint && EXCLUDED_ENDPOINTS.some((e) => endpoint.startsWith(e))) {
      return next.handle();
    }

    const startedAt = Date.now();

    const safeRequestBody = redact((req as any).body ?? {});
    const query = redact((req as any).query ?? {});
    const user_id = req.user?.id;
    const device_token = req.headers['device-token'] as string;

    let responsePayload: any = undefined;

    // Captura caso usem res.json/res.send manualmente
    const originalJson = res.json?.bind(res);
    const originalSend = res.send?.bind(res);

    if (originalJson) {
      res.json = (body: any) => {
        responsePayload = body;
        return originalJson(body);
      };
    }
    if (originalSend) {
      res.send = (body: any) => {
        try {
          responsePayload = typeof body === 'string' ? JSON.parse(body) : body;
        } catch {
          responsePayload = body;
        }
        return originalSend(body);
      };
    }

    // DICA extra: marque status >=400 como erro mesmo se nenhum body for capturado
    const isErrorStatus = () => {
      const s = Number(res?.statusCode ?? 200);
      return Number.isFinite(s) && s >= 400;
    };

    return next.handle().pipe(
      // Captura sucesso e erro **sem** engolir/reatirar erro
      tap({
        next: (data) => {
          if (data !== undefined) responsePayload = data;
        },
        error: (err) => {
          responsePayload = {
            error: true,
            name: err?.name,
            message: err?.message,
            status: (err as any)?.status ?? Number(res?.statusCode ?? 500),
          };
          // opcional:
          console.log('[LoggingInterceptor] erro capturado:', responsePayload);
        },
      }),
      finalize(async () => {
        const success =
          !(responsePayload && responsePayload.error) && !isErrorStatus();

        const log: Prisma.LogsCreateInput = {
          body: safeRequestBody,
          method,
          query,
          endpoint,
          response: redact(
            responsePayload ??
              (isErrorStatus() ? { error: true, status: res?.statusCode } : {}),
          ),
          success,
          datetime: format(new Date(), 'dd/MM/yyyy HH:mm:ssxxx'),
          latencyMs: Date.now() - startedAt,
          device_token,
          user_id,
        };

        try {
          await this.rmqService.publishToQueue({
            routingKey: LOGGING_QUEUE,
            payload: log,
          });
        } catch (e) {
          // opcional: log local de falha de publicação
          this.logger.error('[LoggingInterceptor] RMQ publish failed:', e);
        }
      }),
    );
  }
}
