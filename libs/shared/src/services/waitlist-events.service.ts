import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  WaitlistSlotFreedDto,
  WaitlistSlotFreedReason,
} from '../dto/messaging/waitlist';
import { SCHEDULER_QUEUES } from '../modules/rmq/constants';
import { RmqService } from '../modules/rmq/rmq.service';

@Injectable()
export class WaitlistEventsService {
  constructor(private readonly rmqService: RmqService) {}

  /**
   * Avisa o scheduler que um horário ficou livre. Nunca lança: o cancelamento
   * (ou a resposta da oferta) não pode falhar por causa da fila; o
   * `RmqService` já engole erro de publish, aqui garantimos o mesmo pra
   * qualquer erro inesperado de montagem.
   */
  async publishSlotFreed(params: {
    businessId: string;
    professionalProfileId: string;
    slotStartUtc: Date;
    slotEndUtc: Date;
    excludedPersonId?: string | null;
    reason: WaitlistSlotFreedReason;
  }) {
    try {
      await this.rmqService.publishToQueue({
        routingKey: SCHEDULER_QUEUES.WAITLIST.SLOT_FREED_QUEUE,
        payload: new WaitlistSlotFreedDto({
          message_id: randomUUID(),
          business_id: params.businessId,
          professional_profile_id: params.professionalProfileId,
          slot_start_at_utc: params.slotStartUtc.toISOString(),
          slot_end_at_utc: params.slotEndUtc.toISOString(),
          excluded_person_id: params.excludedPersonId ?? null,
          reason: params.reason,
        }),
      });
    } catch {
      // sem PII no log; a vaga segue livre pro fluxo normal
    }
  }
}
