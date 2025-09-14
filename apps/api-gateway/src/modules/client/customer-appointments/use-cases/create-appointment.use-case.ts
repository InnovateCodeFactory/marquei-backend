import { PrismaService } from '@app/shared';
import { SendNewAppointmentProfessionalDto } from '@app/shared/dto/messaging/mail-notifications/send-new-appointment-professional.dto';
import { SendPushNotificationDto } from '@app/shared/dto/messaging/push-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import {
  RABBIT_EXCHANGE,
  RmqService,
} from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import { getTwoNames } from '@app/shared/utils';
import { NotificationMessageBuilder } from '@app/shared/utils/notification-message-builder';
import { Price } from '@app/shared/value-objects';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
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

  async execute(payload: CreateCustomerAppointmentDto, request: AppRequest) {
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
        customerPerson: {
          connect: {
            id: request.user.personId,
          },
        },
      },
      select: {
        customerPerson: {
          select: {
            name: true,
          },
        },
        professional: {
          select: {
            User: {
              select: {
                push_token: true,
                email: true,
                name: true,
              },
            },
            business_id: true,
          },
        },
        service: {
          select: {
            name: true,
            price_in_cents: true,
            duration: true,
          },
        },
      },
    });

    const pushTokens = appointment.professional.User.push_token
      ? [appointment.professional.User.push_token]
      : [];

    const { body, title } =
      NotificationMessageBuilder.buildAppointmentCreatedMessage({
        customer_name: getTwoNames(appointment.customerPerson.name),
        dayAndMonth: format(payload.appointment_date, 'dd/MM'),
        time: format(payload.appointment_date, 'HH:mm'),
        service_name: appointment.service.name,
      });

    const durationHours = Math.floor(appointment.service.duration / 60);
    const durationMinutes = appointment.service.duration % 60;

    const durationFormatted =
      durationHours > 0
        ? `${durationHours}h ${durationMinutes}min`
        : `${durationMinutes}min`;

    await Promise.all([
      this.rmqService.publishToQueue({
        payload: new SendPushNotificationDto({
          pushTokens,
          body,
          title,
        }),
        routingKey:
          MESSAGING_QUEUES.PUSH_NOTIFICATIONS.APPOINTMENT_CREATED_QUEUE,
      }),
      this.rmqService.publishToQueue({
        payload: {
          business_id: appointment.professional.business_id,
          person_id: request.user.personId,
        },
        routingKey: 'check-customer-appointment-created',
      }),
      this.rmqService.publishToQueue({
        payload: new SendNewAppointmentProfessionalDto({
          toName: getTwoNames(appointment.professional.User.name),
          byName: getTwoNames(appointment.customerPerson.name),
          serviceName: appointment.service.name,
          apptDate: format(payload.appointment_date, 'dd/MM/yyyy'),
          apptTime: format(payload.appointment_date, 'HH:mm'),
          price: new Price(appointment.service.price_in_cents).toCurrency(),
          clientNotes: notes || '-',
          to: appointment?.professional.User.email,
          duration: durationFormatted,
        }),
        routingKey:
          MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_NEW_APPOINTMENT_MAIL_QUEUE,
      }),
    ]);

    // TODO: Criar fila para verificar se o customer já é cliente da empresa, se não for, criar o vínculo

    return null;
  }

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    queue: 'check-customer-appointment-created',
    routingKey: 'check-customer-appointment-created',
  })
  async handleCustomerAppointmentCreatedMessage({
    business_id,
    person_id,
  }: {
    person_id: string;
    business_id: string;
  }) {
    this.logger.debug(
      `Processing check-customer-appointment-created message for business ID ${business_id} and person ID ${person_id}`,
    );
    try {
      const isCustomerAlreadyLinked =
        await this.prismaService.businessCustomer.findFirst({
          where: {
            businessId: business_id,
            personId: person_id,
          },
          select: {
            id: true,
          },
        });

      if (!isCustomerAlreadyLinked?.id) {
        const customer = await this.prismaService.person.findUnique({
          where: { id: person_id },
          select: { phone: true, email: true },
        });

        await this.prismaService.businessCustomer.create({
          data: {
            businessId: business_id,
            personId: person_id,
            email: customer?.email || '',
            phone: customer?.phone || '',
            verified: true,
          },
        });
        this.logger.debug(
          `Customer with person ID ${person_id} linked to business ID ${business_id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing check-customer-appointment-created message: ${error.message}`,
      );
    }
  }
}
