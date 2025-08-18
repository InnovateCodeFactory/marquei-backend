import { PrismaService } from '@app/shared';
import { SendPushNotificationDto } from '@app/shared/dto/messaging/push-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { getTwoNames } from '@app/shared/utils';
import { NotificationMessageBuilder } from '@app/shared/utils/notification-message-builder';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { CreateCustomerAppointmentDto } from '../dto/requests/create-customer-appointment.dto';

@Injectable()
export class CreateAppointmentUseCase {
  private readonly logger = new Logger(CreateAppointmentUseCase.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(payload: CreateCustomerAppointmentDto) {
    const { appointment_date, professional_id, service_id, notes } = payload;

    const isTheDateTaken = await this.prismaService.appointment.findFirst({
      where: {
        scheduled_at: new Date(appointment_date),
        professionalProfileId: professional_id,
      },
      select: {
        id: true,
      },
    });

    if (isTheDateTaken) {
      throw new BadRequestException(
        'Já existe um agendamento para essa data e horário com esse profissional.',
      );
    }

    const appointment = await this.prismaService.appointment.create({
      data: {
        scheduled_at: new Date(appointment_date),
        professional: {
          connect: {
            id: professional_id,
          },
        },
        status: 'PENDING',
        service: {
          connect: {
            id: service_id,
          },
        },
        notes: notes || null,
        customer: {
          connect: {
            userId: 'cme8y3jqo0001v5gudda6ctnj',
          },
        },
      },
      select: {
        customer: {
          select: {
            name: true,
          },
        },
        professional: {
          select: {
            User: {
              select: {
                push_token: true,
              },
            },
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    const pushTokens = appointment.professional.User.push_token
      ? [appointment.professional.User.push_token]
      : [];

    const { body, title } =
      NotificationMessageBuilder.buildAppointmentCreatedMessage({
        customer_name: getTwoNames(appointment.customer.name),
        dayAndMonth: format(payload.appointment_date, 'dd/MM'),
        time: format(payload.appointment_date, 'HH:mm'),
        service_name: appointment.service.name,
      });

    this.logger.debug(
      `Enviando notificação para os tokens: ${pushTokens.join(', ')}`,
    );
    this.logger.debug({ body, title });

    await this.rmqService.publishToQueue({
      payload: new SendPushNotificationDto({
        pushTokens,
        body,
        title,
      }),
      routingKey: MESSAGING_QUEUES.PUSH_NOTIFICATIONS.APPOINTMENT_CREATED_QUEUE,
    });

    return null;
  }
}
