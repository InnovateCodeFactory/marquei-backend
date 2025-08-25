import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { formatDuration, getTwoNames } from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Injectable()
export class GetNextAppointmentUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute({ user }: AppRequest) {
    // Arrumar payment para criar customerid no stripe
    const nextAppointment = await this.prismaService.appointment.findFirst({
      where: {
        customerPerson: {
          user: {
            id: user.id,
          },
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduled_at: {
          gte: new Date(),
        },
      },
      select: {
        id: true,
        scheduled_at: true,
        professional: {
          select: {
            User: {
              select: {
                name: true,
              },
            },
          },
        },
        service: {
          select: {
            name: true,
            duration: true,
            price_in_cents: true,
          },
        },
        status: true,
      },
    });

    if (!nextAppointment) return null;

    return {
      id: nextAppointment.id,
      professional: {
        name: getTwoNames(nextAppointment.professional.User.name),
      },
      service: {
        name: nextAppointment.service.name,
        duration: formatDuration(nextAppointment.service.duration),
        price: new Price(nextAppointment.service.price_in_cents).toCurrency(),
      },
      date: {
        day: format(nextAppointment.scheduled_at, 'dd', { locale: ptBR }),
        month: format(nextAppointment.scheduled_at, 'MMM', { locale: ptBR }),
        hour: format(nextAppointment.scheduled_at, 'HH:mm', { locale: ptBR }),
      },
      status: nextAppointment.status,
    };
  }
}
