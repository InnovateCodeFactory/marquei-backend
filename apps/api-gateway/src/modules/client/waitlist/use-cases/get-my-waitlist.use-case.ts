import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { tz } from '@date-fns/tz';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { format } from 'date-fns';
import { GetMyWaitlistDto } from '../dto/requests/get-my-waitlist.dto';
import {
  computeWaitlistPosition,
  presentOffer,
  waitlistEntrySelect,
} from './waitlist-presenter';

const IN_TZ = tz('America/Sao_Paulo');

@Injectable()
export class GetMyWaitlistUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMyWaitlistDto, req: AppRequest) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Usuário não autenticado.');

    const now = new Date();
    const today = new Date(
      `${format(now, 'yyyy-MM-dd', { in: IN_TZ })}T00:00:00.000Z`,
    );

    const entries = await this.prisma.waitlistEntry.findMany({
      where: {
        personId,
        status: 'WAITING',
        date: { gte: today },
        ...(query.business_slug
          ? { business: { slug: query.business_slug } }
          : {}),
      },
      orderBy: [{ date: 'asc' }, { queued_at: 'asc' }],
      take: 50,
      select: {
        ...waitlistEntrySelect,
        offers: {
          where: { status: 'PENDING', expires_at_utc: { gt: now } },
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            slot_start_at_utc: true,
            slot_end_at_utc: true,
            expires_at_utc: true,
            professional: { select: { User: { select: { name: true } } } },
            service: { select: { name: true } },
            serviceCombo: { select: { name: true } },
          },
        },
      },
    });

    return Promise.all(
      entries.map(async (entry) => ({
        id: entry.id,
        business: entry.business,
        date: format(entry.date, 'yyyy-MM-dd'),
        status: entry.status,
        professional_name: entry.professional?.User?.name ?? null,
        service_name: entry.service?.name ?? entry.serviceCombo?.name ?? null,
        position: await computeWaitlistPosition(this.prisma, entry),
        offer: entry.offers[0] ? presentOffer(entry.offers[0], now) : null,
      })),
    );
  }
}
