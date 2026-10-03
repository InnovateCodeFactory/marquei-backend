export type WaitlistSlotFreedReason =
  | 'APPOINTMENT_CANCELED'
  | 'OFFER_EXPIRED'
  | 'OFFER_DECLINED'
  | 'OFFER_SUPERSEDED';

/**
 * Publicado quando um horário fica livre (cancelamento) ou quando uma oferta
 * da lista de espera não foi aproveitada e a vaga deve ir para o próximo.
 * `message_id` é obrigatório (idempotência do consumer).
 */
export class WaitlistSlotFreedDto {
  message_id: string;
  business_id: string;
  professional_profile_id: string;
  slot_start_at_utc: string; // ISO
  slot_end_at_utc: string; // ISO
  /** Quem liberou/perdeu a vaga: nunca recebe oferta do mesmo horário. */
  excluded_person_id?: string | null;
  reason: WaitlistSlotFreedReason;

  constructor(obj: WaitlistSlotFreedDto) {
    Object.assign(this, obj);
  }
}
