import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatDate, formatDuration } from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GetCustomerDetailsDto } from '../dto/requests/get-customer-details.dto';

@Injectable()
export class GetCustomerAppointmentsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute({ id }: GetCustomerDetailsDto, user: CurrentUser) {
    const appointments = await this.prismaService.customer.findUnique({
      where: { id },
      select: {
        Appointment: {
          where: {
            professional: {
              business_id: user.current_selected_business_id,
            },
          },
          orderBy: {
            created_at: 'desc',
          },
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
          },
        },
      },
    });

    if (!appointments) throw new NotFoundException('Cliente não encontrado');

    const arr = appointments.Appointment?.map((appointment) => ({
      id: appointment.id,
      status: appointment.status,
      date: {
        day: formatDate(appointment.scheduled_at, 'dd'),
        month: formatDate(appointment.scheduled_at, 'MMM'),
        hour: formatDate(appointment.scheduled_at, 'HH:mm'),
      },
      service: {
        name: appointment.service.name,
        price: new Price(appointment.service.price_in_cents).toCurrency(),
        duration: formatDuration(appointment.service.duration, 'medium'),
      },
    }));

    return arr;
  }
}
