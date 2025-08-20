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
    // id aqui é o BusinessCustomer.id (vínculo no negócio)
    const bc = await this.prisma.businessCustomer.findUnique({
      where: { id },
      select: { personId: true },
    });
    if (!bc) throw new NotFoundException('Cliente não encontrado');

    const appointments = await this.prisma.appointment.findMany({
      where: {
        personId: bc.personId, // 👈 cliente do agendamento
        professional: {
          business_id: user.current_selected_business_id, // 👈 só do negócio selecionado
        },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        status: true,
        scheduled_at: true,
        service: {
          select: {
            name: true,
            price_in_cents: true,
            duration: true,
          },
        },
        professional: {
          select: {
            User: { select: { name: true } },
          },
        },
      },
    });

    const arr = appointments.map((appointment) => {
      // ajuste de fuso se necessário
      const scheduledAtTz = addHours(appointment.scheduled_at, 3);
      const hourStart = formatDate(scheduledAtTz, 'HH:mm');
      const scheduledEnd = addMinutes(
        scheduledAtTz,
        appointment.service.duration,
      );
      const hourEnd = formatDate(scheduledEnd, 'HH:mm');

      return {
        id: appointment.id,
        status: appointment.status,
        date: {
          day: formatDate(appointment.scheduled_at, 'dd'),
          month: formatDate(appointment.scheduled_at, 'MMM'),
          hour: hourStart,
          hour_end: hourEnd,
        },
        service: {
          name: appointment.service.name,
          price: new Price(appointment.service.price_in_cents).toCurrency(),
        },
        professional: {
          name: getTwoNames(appointment.professional.User.name),
        },
      };
    });

    return arr;
  }
}
