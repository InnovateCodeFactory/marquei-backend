import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatDate, getTwoNames } from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { Injectable, NotFoundException } from '@nestjs/common';
import { addHours, addMinutes } from 'date-fns';
import { GetCustomerDetailsDto } from '../dto/requests/get-customer-details.dto';

@Injectable()
export class GetCustomerAppointmentsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id }: GetCustomerDetailsDto, user: CurrentUser) {
    // id é do BusinessContact
    const contact = await this.prisma.businessContact.findUnique({
      where: { id },
      select: { customerId: true },
    });

    if (!contact) throw new NotFoundException('Cliente não encontrado');

    if (!contact.customerId) {
      // contato ainda não tem perfil global
      return [];
    }

    const appointments = await this.prisma.appointment.findMany({
      where: {
        customerProfileId: contact.customerId,
        professional: {
          business_id: user.current_selected_business_id,
        },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        status: true,
        scheduled_at: true,
        service: {
          select: { name: true, price_in_cents: true, duration: true },
        },
        professional: {
          select: {
            person: { select: { name: true } },
          },
        },
      },
    });

    return appointments.map((a) => {
      const scheduledAtWithTimezone = addHours(a.scheduled_at, 3);
      const hourStart = formatDate(scheduledAtWithTimezone, 'HH:mm');

      const scheduledEnd = addMinutes(
        scheduledAtWithTimezone,
        a.service.duration,
      );
      const hourEnd = formatDate(scheduledEnd, 'HH:mm');

      return {
        id: a.id,
        status: a.status,
        date: {
          day: formatDate(a.scheduled_at, 'dd'),
          month: formatDate(a.scheduled_at, 'MMM'),
          hour: hourStart,
          hour_end: hourEnd,
        },
        service: {
          name: a.service.name,
          price: new Price(a.service.price_in_cents).toCurrency(),
        },
        professional: {
          name: getTwoNames(a.professional.person.name),
        },
      };
    });
  }
}
