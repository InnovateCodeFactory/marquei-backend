import { Injectable, Logger, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, Subject, finalize } from 'rxjs';

type AppointmentEventOrigin = 'CLIENT_APP' | 'PROFESSIONAL_APP' | 'PROFESSIONAL_WEB';
export type AppointmentRealtimeEventType =
  | 'appointment-created'
  | 'appointment-cancelled'
  | 'appointment-confirmed'
  | 'appointment-rescheduled';

export type PublishAppointmentEventPayload = {
  event_type: AppointmentRealtimeEventType;
  business_id: string;
  appointment_id: string;
  professional_profile_id?: string | null;
  created_by_user_type: 'CUSTOMER' | 'PROFESSIONAL';
  created_by_user_id?: string | null;
  origin: AppointmentEventOrigin;
};

type ConnectionPayload = {
  business_id: string;
  user_id: string;
};

@Injectable()
export class AppointmentEventsStreamService implements OnModuleDestroy {
  private readonly logger = new Logger(AppointmentEventsStreamService.name);
  private readonly businessStreams = new Map<string, Set<Subject<MessageEvent>>>();
  private readonly streamMeta = new Map<
    Subject<MessageEvent>,
    {
      heartbeatTimer: NodeJS.Timeout;
      businessId: string;
      userId: string;
    }
  >();

  private readonly heartbeatIntervalMs = 20_000;

  connect({ business_id, user_id }: ConnectionPayload): Observable<MessageEvent> {
    const stream = new Subject<MessageEvent>();
    const bucket = this.businessStreams.get(business_id) ?? new Set<Subject<MessageEvent>>();
    bucket.add(stream);
    this.businessStreams.set(business_id, bucket);

    const heartbeatTimer = setInterval(() => {
      this.safeNext(stream, {
        type: 'heartbeat',
        data: JSON.stringify({
          timestamp: new Date().toISOString(),
        }),
      });
    }, this.heartbeatIntervalMs);

    this.streamMeta.set(stream, { heartbeatTimer, businessId: business_id, userId: user_id });

    this.safeNext(stream, {
      type: 'connected',
      retry: 5000,
      data: JSON.stringify({
        business_id,
        user_id,
        connected_at: new Date().toISOString(),
      }),
    });

    this.logger.debug(
      `SSE connected | business=${business_id} user=${user_id} active=${bucket.size}`,
    );

    return stream.asObservable().pipe(finalize(() => this.disconnect(stream)));
  }

  publishAppointmentEvent(payload: PublishAppointmentEventPayload): void {
    const subscribers = this.businessStreams.get(payload.business_id);
    if (!subscribers?.size) return;

    const eventId = randomUUID();
    const data = {
      ...payload,
      event_id: eventId,
      emitted_at: new Date().toISOString(),
    };

    for (const stream of subscribers) {
      this.safeNext(stream, {
        id: eventId,
        type: payload.event_type,
        retry: 5000,
        data: JSON.stringify(data),
      });
    }
  }

  publishAppointmentCreated(
    payload: Omit<PublishAppointmentEventPayload, 'event_type'>,
  ): void {
    this.publishAppointmentEvent({
      ...payload,
      event_type: 'appointment-created',
    });
  }

  private disconnect(stream: Subject<MessageEvent>): void {
    const meta = this.streamMeta.get(stream);
    if (!meta) return;

    clearInterval(meta.heartbeatTimer);
    this.streamMeta.delete(stream);

    const bucket = this.businessStreams.get(meta.businessId);
    if (!bucket) return;

    bucket.delete(stream);
    if (!bucket.size) {
      this.businessStreams.delete(meta.businessId);
    }

    this.logger.debug(
      `SSE disconnected | business=${meta.businessId} user=${meta.userId} active=${bucket.size}`,
    );
  }

  private safeNext(stream: Subject<MessageEvent>, event: MessageEvent): void {
    try {
      if (!stream.closed) {
        stream.next(event);
      }
    } catch (error) {
      this.logger.warn(`SSE stream send failure: ${(error as Error).message}`);
      try {
        stream.complete();
      } catch {}
    }
  }

  onModuleDestroy() {
    for (const [stream, meta] of this.streamMeta.entries()) {
      clearInterval(meta.heartbeatTimer);
      try {
        stream.complete();
      } catch {}
    }
    this.streamMeta.clear();
    this.businessStreams.clear();
  }
}
