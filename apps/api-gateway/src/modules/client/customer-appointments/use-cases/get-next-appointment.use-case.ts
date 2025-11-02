import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { formatDuration, getTwoNames } from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { tz } from '@date-fns/tz';
import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Injectable()
export class GetNextAppointmentUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute({ user }: AppRequest) {
    const nowUtc = new Date();

    const nextAppointment = await this.prismaService.appointment.findFirst({
      where: {
        customerPerson: { user: { id: user.id } },
        status: { in: ['PENDING', 'CONFIRMED'] },
        start_at_utc: { gte: nowUtc },
      },
      orderBy: { start_at_utc: 'asc' },
      select: {
        id: true,
        start_at_utc: true,
        end_at_utc: true,
        status: true,
        timezone: true, // ex.: "America/Sao_Paulo"
        duration_minutes: true, // se você persistir isso
        professional: {
          select: {
            id: true,
            business: { select: { slug: true } },
            User: { select: { name: true } },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true, // fallback se não houver duration_minutes
            price_in_cents: true,
          },
        },
      },
    });

    if (!nextAppointment) return null;

    const zoneId = nextAppointment.timezone || 'America/Sao_Paulo';
    const IN_TZ = tz(zoneId);

    const durationMin =
      nextAppointment.duration_minutes ?? nextAppointment.service.duration;

    return {
      id: nextAppointment.id,
      business_slug: nextAppointment.professional.business.slug,
      professional: {
        id: nextAppointment.professional.id,
        name: getTwoNames(nextAppointment.professional.User.name),
      },
      service: {
        id: nextAppointment.service.id,
        name: nextAppointment.service.name,
        duration: formatDuration(durationMin),
        price: new Price(nextAppointment.service.price_in_cents).toCurrency(),
      },
      date: {
        day: format(nextAppointment.start_at_utc, 'dd', {
          locale: ptBR,
          in: IN_TZ,
        }),
        month: format(nextAppointment.start_at_utc, 'MMM', {
          locale: ptBR,
          in: IN_TZ,
        }),
        hour: format(nextAppointment.start_at_utc, 'HH:mm', {
          locale: ptBR,
          in: IN_TZ,
        }),
      },
      status: nextAppointment.status,
    };
  }
}
