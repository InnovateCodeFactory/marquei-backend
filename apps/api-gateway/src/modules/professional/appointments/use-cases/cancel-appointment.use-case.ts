import { PrismaService } from '@app/shared';
import { SendCancelAppointmentMailDto } from '@app/shared/dto/messaging/mail-notifications/send-cancel-appointment.dto';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import {
  formatDurationToHoursAndMinutes,
  getClientIp,
  getTwoNames,
} from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { BadRequestException, Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { CancelAppointmentDto } from '../dto/requests/cancel-appointment.dto';

@Injectable()
export class CancelAppointmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(body: CancelAppointmentDto, req: AppRequest) {
    const { appointment_id, reason } = body;
    const { user, headers } = req;

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointment_id },
      select: {
        id: true,
        status: true,
        professional: {
          select: {
            userId: true,
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
        scheduled_at: true,
        customerPerson: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new BadRequestException('Agendamento não encontrado');
    }

    if (appointment.status === 'CANCELED') {
      throw new BadRequestException('Agendamento já está cancelado');
    }

    await Promise.all([
      this.prisma.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          by_professional: true,
          event_type: 'CANCELED',
          by_user_id: user.id,
          reason,
          ip: getClientIp(req),
          user_agent: headers['user-agent'],
        },
      }),
      appointment.customerPerson?.email &&
        this.rmqService.publishToQueue({
          payload: new SendCancelAppointmentMailDto({
            serviceName: appointment?.service?.name,
            apptDate: format(appointment?.scheduled_at, 'dd/MM/yyyy'),
            apptTime: format(appointment?.scheduled_at, 'HH:mm'),
            clientName: getTwoNames(appointment?.customerPerson?.name),
            duration: formatDurationToHoursAndMinutes(
              appointment?.service?.duration,
            ),
            price: new Price(
              appointment?.service?.price_in_cents,
            )?.toCurrency(),
            professionalName: getTwoNames(appointment.professional?.User?.name),
            to: appointment.customerPerson?.email,
          }),
          routingKey:
            MESSAGING_QUEUES.MAIL_NOTIFICATIONS
              .SEND_CANCEL_APPOINTMENT_CUSTOMER_MAIL_QUEUE,
        }),
    ]);

    return;
  }
}
