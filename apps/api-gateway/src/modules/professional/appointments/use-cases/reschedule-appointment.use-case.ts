import { PrismaService } from '@app/shared';
import { SendRescheduleAppointmentMailDto } from '@app/shared/dto/messaging/mail-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import {
  formatDurationToHoursAndMinutes,
  getClientIp,
  getTwoNames,
} from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { format } from 'date-fns';
import { RescheduleAppointmentDto } from '../dto/requests/reschedule-appointment.dto';

@Injectable()
export class RescheduleAppointmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(body: RescheduleAppointmentDto, req: AppRequest) {
    const { appointment_id, new_appointment_date } = body;
    const { user, headers } = req;

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointment_id },
      select: {
        id: true,
        status: true,
        notes: true,
        professional: {
          select: {
            userId: true,
            User: {
              select: {
                name: true,
              },
            },
            business_id: true,
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

    if (
      appointment.professional?.business_id !==
      user.current_selected_business_id
    ) {
      throw new ForbiddenException(
        'O profissional não pode remarcar este agendamento',
      );
    }

    if (!appointment) {
      throw new BadRequestException('Agendamento não encontrado');
    }

    if (
      appointment.status !== 'PENDING' &&
      appointment.status !== 'COMPLETED'
    ) {
      throw new BadRequestException(
        'Apenas agendamentos pendentes ou confirmados podem ser remarcados',
      );
    }

    await Promise.all([
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          scheduled_at: new_appointment_date,
          status: 'PENDING',
          events: {
            create: {
              by_professional: true,
              event_type: 'RESCHEDULED',
              by_user_id: user.id,
              ip: getClientIp(req),
              user_agent: headers['user-agent'],
            },
          },
        },
      }),
      this.rmqService.publishToQueue({
        payload: new SendRescheduleAppointmentMailDto({
          serviceName: appointment?.service?.name,
          apptDate: format(appointment?.scheduled_at, 'dd/MM/yyyy'),
          apptTime: format(appointment?.scheduled_at, 'HH:mm'),
          toName: getTwoNames(appointment?.customerPerson?.name),
          duration: formatDurationToHoursAndMinutes(
            appointment?.service?.duration,
          ),
          price: new Price(appointment?.service?.price_in_cents)?.toCurrency(),
          byName: getTwoNames(appointment.professional?.User?.name),
          to: appointment.customerPerson?.email,
          clientNotes: appointment.notes || '-',
          byTypeLabel: 'profissional',
        }),
        routingKey:
          MESSAGING_QUEUES.MAIL_NOTIFICATIONS
            .SEND_RESCHEDULE_APPOINTMENT_MAIL_QUEUE,
      }),
    ]);
    return;
  }
}
