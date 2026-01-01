import { PrismaService } from '@app/shared';
import { SendInAppNotificationDto } from '@app/shared/dto/messaging/in-app-notifications';
import { SendPushNotificationDto } from '@app/shared/dto/messaging/push-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp, getTwoNames } from '@app/shared/utils';
import { NotificationMessageBuilder } from '@app/shared/utils/notification-message-builder';
import { BadRequestException, Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CancelCustomerAppointmentDto } from '../dto/requests/cancel-appointment.dto';

@Injectable()
export class CancelCustomerAppointmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(body: CancelCustomerAppointmentDto, req: AppRequest) {
    const { appointment_id, reason } = body;
    const { user, headers } = req;

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointment_id, personId: user.personId ?? undefined },
      select: {
        id: true,
        status: true,
        start_at_utc: true,
        service: {
          select: {
            name: true,
          },
        },
        customerPerson: {
          select: {
            name: true,
          },
        },
        professional: {
          select: {
            id: true,
            User: {
              select: {
                push_token: true,
              },
            },
          },
        },
      },
    });
    if (!appointment)
      throw new BadRequestException('Agendamento não encontrado');

    if (appointment.status === 'CANCELED') return null;

    await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CANCELED' },
      }),
      this.prisma.reminderJob.updateMany({
        where: {
          appointmentId: appointment.id,
          status: { in: ['PENDING', 'SCHEDULED'] },
        },
        data: {
          status: 'CANCELED',
          error: 'appointment_canceled',
        },
      }),
      this.prisma.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          by_professional: false,
          event_type: 'CANCELED',
          by_user_id: user.id,
          reason: reason ?? undefined,
          ip: getClientIp(req),
          user_agent: headers['user-agent'],
        },
      }),
    ]);

    const bodyAndTitle =
      NotificationMessageBuilder.buildAppointmentCancelledMessageForProfessional(
        {
          customer_name: getTwoNames(appointment.customerPerson?.name) || '',
          service_name: appointment.service?.name || '',
          time: format(appointment.start_at_utc, 'HH:mm', {
            locale: ptBR,
          }),
          dayAndMonth: format(appointment.start_at_utc, 'dd/MM', {
            locale: ptBR,
          }),
        },
      );

    await Promise.all([
      this.rmqService.publishToQueue({
        routingKey: MESSAGING_QUEUES.PUSH_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
        payload: new SendPushNotificationDto({
          pushTokens: [appointment.professional.User.push_token],
          body: bodyAndTitle.body,
          title: bodyAndTitle.title,
        }),
      }),

      this.rmqService.publishToQueue({
        routingKey:
          MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
        payload: new SendInAppNotificationDto({
          title: bodyAndTitle.title,
          body: bodyAndTitle.body,
          professionalProfileId: appointment.professional.id,
        }),
      }),
    ]);

    return null;
  }
}
