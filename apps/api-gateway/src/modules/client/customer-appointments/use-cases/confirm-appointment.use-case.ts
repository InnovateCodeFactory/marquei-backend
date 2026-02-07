import { PrismaService } from '@app/shared';
import { SendPushNotificationDto } from '@app/shared/dto/messaging/push-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import { NotificationMessageBuilder } from '@app/shared/utils/notification-message-builder';
import { tz } from '@date-fns/tz';
import { BadRequestException, Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { ConfirmAppointmentDto } from '../dto/requests/confirm-appointment.dto';

@Injectable()
export class ConfirmCustomerAppointmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(body: ConfirmAppointmentDto, req: AppRequest) {
    const { appointment_id } = body;
    const { user, headers } = req;

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointment_id, personId: user.personId ?? undefined },
      select: {
        id: true,
        status: true,
        start_at_utc: true,
        timezone: true,
        service: { select: { name: true } },
        customerPerson: { select: { name: true } },
        professional: {
          select: {
            push_notification_enabled: true,
            User: { select: { push_token: true } },
          },
        },
      },
    });
    if (!appointment) throw new BadRequestException('Agendamento não encontrado');

    if (appointment.status === 'CANCELED')
      throw new BadRequestException('Agendamento já cancelado');

    if (appointment.status === 'CONFIRMED') return null; // no-op

    const reminderRequestedByProfessional =
      await this.prisma.appointmentEvent.findFirst({
        where: {
          appointmentId: appointment.id,
          event_type: 'REMINDER_SENT',
          by_professional: true,
        },
        select: { id: true },
      });

    await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CONFIRMED' },
      }),
      this.prisma.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          by_professional: false,
          event_type: 'CONFIRMED',
          by_user_id: user.id,
          ip: getClientIp(req),
          user_agent: headers['user-agent'],
        },
      }),
    ]);

    if (!reminderRequestedByProfessional) return null;

    const allowPush = appointment.professional.push_notification_enabled === true;
    const pushToken = appointment.professional.User?.push_token;
    if (!allowPush || !pushToken) return null;

    const zoneId = appointment.timezone || 'America/Sao_Paulo';
    const IN_TZ = tz(zoneId);
    const notification = NotificationMessageBuilder.buildAppointmentConfirmedMessageForProfessional(
      {
        customer_name: appointment.customerPerson.name,
        service_name: appointment.service.name,
        dayAndMonth: format(appointment.start_at_utc, 'dd/MM', { in: IN_TZ }),
        time: format(appointment.start_at_utc, 'HH:mm', { in: IN_TZ }),
      },
    );

    await this.rmqService.publishToQueue({
      routingKey: MESSAGING_QUEUES.PUSH_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
      payload: new SendPushNotificationDto({
        pushTokens: [pushToken],
        title: notification.title,
        body: notification.body,
      }),
    });

    return null;
  }
}
