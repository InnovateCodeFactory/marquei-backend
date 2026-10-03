import { PrismaService } from '@app/shared';
import { Prisma } from '@prisma/client';

export const waitlistEntrySelect = {
  id: true,
  businessId: true,
  personId: true,
  professionalProfileId: true,
  serviceId: true,
  serviceComboId: true,
  date: true,
  status: true,
  queued_at: true,
  business: { select: { slug: true, name: true, logo: true } },
  professional: { select: { User: { select: { name: true } } } },
  service: { select: { name: true } },
  serviceCombo: { select: { name: true } },
} satisfies Prisma.WaitlistEntrySelect;

export type WaitlistEntryRow = Prisma.WaitlistEntryGetPayload<{
  select: typeof waitlistEntrySelect;
}>;

/**
 * Posição na fila calculada na hora (nunca persistida: muda conforme gente
 * entra, sai ou converte): 1 + quem está WAITING na frente e é compatível
 * com o mesmo profissional.
 */
export async function computeWaitlistPosition(
  prisma: PrismaService,
  entry: Pick<
    WaitlistEntryRow,
    'id' | 'businessId' | 'date' | 'professionalProfileId' | 'queued_at'
  >,
) {
  const and: Prisma.WaitlistEntryWhereInput[] = [
    {
      OR: [
        { queued_at: { lt: entry.queued_at } },
        { queued_at: entry.queued_at, id: { lt: entry.id } },
      ],
    },
  ];
  if (entry.professionalProfileId) {
    and.push({
      OR: [
        { professionalProfileId: entry.professionalProfileId },
        { professionalProfileId: null },
      ],
    });
  }

  const ahead = await prisma.waitlistEntry.count({
    where: {
      businessId: entry.businessId,
      date: entry.date,
      status: 'WAITING',
      AND: and,
    },
  });

  return ahead + 1;
}

export function presentOffer(
  offer: {
    id: string;
    status: string;
    slot_start_at_utc: Date;
    slot_end_at_utc: Date;
    expires_at_utc: Date;
    professional?: { User?: { name: string | null } | null } | null;
    service?: { name: string } | null;
    serviceCombo?: { name: string } | null;
  },
  now = new Date(),
) {
  return {
    id: offer.id,
    status: offer.status,
    slot_start_at: offer.slot_start_at_utc,
    slot_end_at: offer.slot_end_at_utc,
    expires_at: offer.expires_at_utc,
    // o app calcula o contador a partir disso, nunca do relógio do aparelho
    server_now: now,
    seconds_remaining: Math.max(
      0,
      Math.floor((offer.expires_at_utc.getTime() - now.getTime()) / 1000),
    ),
    professional_name: offer.professional?.User?.name ?? null,
    service_name: offer.service?.name ?? offer.serviceCombo?.name ?? null,
  };
}
