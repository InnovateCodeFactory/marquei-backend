import { PrismaService } from '@app/shared';
import { getSystemSetting } from '@app/shared/config/system-general-settings';
import { SendWhatsAppTextMessageDto } from '@app/shared/dto/messaging/whatsapp-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import {
  BUSINESS_REMINDER_TYPE_DEFAULTS,
  getClientIp,
  getTwoNames,
  renderBusinessNotificationTemplate,
} from '@app/shared/utils';
import { tz } from '@date-fns/tz';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { BusinessReminderType } from '@prisma/client';
import { addDays, format } from 'date-fns';
import { RequestAppointmentConfirmationDto } from '../dto/requests/request-appointment-confirmation.dto';

@Injectable()
export class RequestAppointmentConfirmationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(body: RequestAppointmentConfirmationDto, req: AppRequest) {
    const { appointment_id } = body;
    const { user } = req;

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointment_id },
      select: {
        id: true,
        status: true,
        start_at_utc: true,
        timezone: true,
        service: { select: { name: true } },
        professional: {
          select: {
            business_id: true,
            business: { select: { name: true } },
            User: { select: { name: true } },
          },
        },

        customerPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new BadRequestException('Agendamento não encontrado');
    }

    if (
      appointment.professional?.business_id !==
      user.current_selected_business_id
    ) {
      throw new ForbiddenException(
        'O profissional não pode solicitar confirmação deste agendamento',
      );
    }

    if (appointment.status !== 'PENDING') {
      throw new BadRequestException(
        'Só é possível solicitar confirmação para agendamentos pendentes',
      );
    }

    if (!appointment.customerPerson?.phone) {
      throw new BadRequestException('Cliente sem telefone cadastrado');
    }

    const alreadyRequested = await this.prisma.appointmentEvent.findFirst({
      where: {
        appointmentId: appointment.id,
        event_type: 'REMINDER_SENT',
        by_professional: true,
      },
      select: { id: true },
    });

    if (alreadyRequested) {
      throw new BadRequestException('Lembrete já enviado pelo profissional');
    }

    const zoneId = appointment.timezone || 'America/Sao_Paulo';
    const IN_TZ = tz(zoneId);
    const appointmentDayKey = format(appointment.start_at_utc, 'yyyy-MM-dd', {
      in: IN_TZ,
    });
    const todayKey = format(new Date(), 'yyyy-MM-dd', { in: IN_TZ });
    const tomorrowKey = format(addDays(new Date(), 1), 'yyyy-MM-dd', {
      in: IN_TZ,
    });
    const dayAndMonth =
      appointmentDayKey === todayKey
        ? 'hoje'
        : appointmentDayKey === tomorrowKey
          ? 'amanhã'
          : format(appointment.start_at_utc, 'dd/MM', { in: IN_TZ });
    const time = format(appointment.start_at_utc, 'HH:mm', { in: IN_TZ });
    const professionalName = getTwoNames(appointment.professional.User.name);
    const serviceName = appointment.service.name;
    const clientUrl = getSystemSetting('website_client_url');

    const businessName = appointment.professional?.business?.name || '';
    const header = businessName ? `*${businessName}*` : '*Marquei*';

    const messageBase =
      `Olá! Tudo bem? 😊\n\n` +
      `O profissional ${professionalName} solicita a confirmação do seu agendamento de *${serviceName.trim()}* ` +
      `para ${dayAndMonth}, às ${time}.`;

    const confirmationLine = clientUrl
      ? `Para confirmar, é só acessar o link abaixo:\n${clientUrl}`
      : `Para confirmar, basta acessar o aplicativo.`;

    const customerLink = await this.prisma.businessCustomer.findFirst({
      where: {
        businessId: appointment.professional.business_id,
        personId: appointment.customerPerson.id,
      },
      select: { verified: true },
    });
    const reminderSettings =
      await this.prisma.businessReminderSettings.findUnique({
        where: {
          uq_business_reminder_settings_business_type: {
            businessId: appointment.professional.business_id,
            type: BusinessReminderType.APPOINTMENT_CONFIRMATION_REQUEST,
          },
        },
        select: { message_template: true, channels: true, is_active: true },
      });
    if (
      reminderSettings &&
      (!reminderSettings.is_active ||
        !reminderSettings.channels.includes('WHATSAPP'))
    ) {
      throw new BadRequestException(
        'O canal de confirmação por WhatsApp está desativado.',
      );
    }
    const shouldSuggestSignup = !customerLink?.verified;
    const signupLine = shouldSuggestSignup
      ? '\n\nCaso ainda não tenha uma conta, você pode criar uma rapidamente pelo link ou, se preferir, pelo aplicativo *Marquei Clientes*.'
      : '';

    const defaultMessage = `${header}\n\n${messageBase}\n\n${confirmationLine}${signupLine}`;
    const dayWithPreposition =
      dayAndMonth === 'hoje' || dayAndMonth === 'amanhã'
        ? dayAndMonth
        : `em ${dayAndMonth}`;
    const template =
      reminderSettings?.message_template?.trim() ||
      BUSINESS_REMINDER_TYPE_DEFAULTS[
        BusinessReminderType.APPOINTMENT_CONFIRMATION_REQUEST
      ].message_template;
    const message =
      renderBusinessNotificationTemplate({
        template,
        variables: {
          business_name: businessName || 'Marquei',
          customer_name: appointment.customerPerson.name || '',
          professional_name: professionalName,
          service_name: serviceName,
          day: dayAndMonth,
          day_with_preposition: dayWithPreposition,
          time,
          client_app_url: clientUrl || '',
          confirmation_action: confirmationLine,
          signup_hint: signupLine,
        },
      }) || defaultMessage;

    await this.rmqService.publishToQueue({
      routingKey:
        MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS.SEND_TEXT_MESSAGE_QUEUE,
      payload: new SendWhatsAppTextMessageDto({
        phone_number: appointment.customerPerson.phone,
        message,
      }),
    });

    const { headers } = req;
    await this.prisma.appointmentEvent.create({
      data: {
        appointmentId: appointment.id,
        event_type: 'REMINDER_SENT',
        by_professional: true,
        by_user_id: user.id,
        reason: 'reminder',
        ip: getClientIp(req),
        user_agent: headers['user-agent'],
      },
    });

    return null;
  }
}
