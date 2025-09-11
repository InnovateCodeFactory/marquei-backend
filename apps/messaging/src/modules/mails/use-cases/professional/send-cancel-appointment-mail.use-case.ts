import { PrismaService } from '@app/shared';
import { SendCancelAppointmentMailDto } from '@app/shared/dto/messaging/mail-notifications/send-cancel-appointment.dto';
import { SendMailTypeEnum } from '@app/shared/enum';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { MailBaseService } from '../../mail-base.service';

@Injectable()
export class SendCancelAppointmentProfessionalMailUseCase
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(
    SendCancelAppointmentProfessionalMailUseCase.name,
  );

  constructor(
    private readonly mailBaseService: MailBaseService,
    private prisma: PrismaService,
  ) {}

  async onApplicationBootstrap() {
    // await this.execute({
    //   // to: 'alanagabriele43@gmail.com',
    //   firstName: 'Carlos',
    //   to: 'chziegler445@gmail.com',
    // });
  }

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    routingKey:
      MESSAGING_QUEUES.MAIL_NOTIFICATIONS
        .SEND_CANCEL_APPOINTMENT_PROFESSIONAL_MAIL_QUEUE,
    queue:
      MESSAGING_QUEUES.MAIL_NOTIFICATIONS
        .SEND_CANCEL_APPOINTMENT_PROFESSIONAL_MAIL_QUEUE,
  })
  async execute({
    to,
    apptDate,
    apptTime,
    clientName,
    duration,
    price,
    professionalName,
    serviceName,
  }: SendCancelAppointmentMailDto) {
    try {
      const template = await this.prisma.mailTemplate.findFirst({
        where: {
          type: SendMailTypeEnum.APPOINTMENT_CANCELLATION_PROFESSIONAL,
          active: true,
        },
        select: {
          subject: true,
          html: true,
          from: true,
          pre_header: true,
        },
      });
      if (!template) throw new Error('Template de email não encontrado');

      const html = this.mailBaseService.fillTemplate({
        type: SendMailTypeEnum.APPOINTMENT_CANCELLATION_PROFESSIONAL,
        template: template.html,
        data: {
          PROFESSIONAL_NAME: professionalName,
          CLIENT_NAME: clientName,
          SERVICE_NAME: serviceName,
          APPT_DATE: apptDate,
          APPT_TIME: apptTime,
          DURATION: duration,
          PRICE: price,
          PREHEADER: template.pre_header || '',
        },
      });

      const response = await this.mailBaseService.sendMail({
        to,
        subject: template.subject,
        html,
        from: template.from,
      });

      if (!response) throw new Error('Erro ao enviar email');

      this.logger.debug(
        `Email de agendamento cancelado enviado para o profissional: ${to}`,
      );

      return;
    } catch (error) {
      this.logger.error(error);
    }
  }
}
