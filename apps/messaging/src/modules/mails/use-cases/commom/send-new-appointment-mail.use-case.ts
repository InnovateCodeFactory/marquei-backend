import { PrismaService } from '@app/shared';
import { SendNewAppointmentProfessionalDto } from '@app/shared/dto/messaging/mail-notifications/send-new-appointment-professional.dto';
import { SendMailTypeEnum } from '@app/shared/enum';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { MailBaseService } from '../../mail-base.service';

@Injectable()
export class SendNewAppointmentMailUseCase implements OnApplicationBootstrap {
  private readonly logger = new Logger(SendNewAppointmentMailUseCase.name);

  constructor(
    private readonly mailBaseService: MailBaseService,
    private prisma: PrismaService,
  ) {}

  async onApplicationBootstrap() {
    // await this.execute({
    //   to: 'chziegler445@gmail.com',
    //   apptDate: '27/08/2025',
    //   apptTime: '14:00',
    //   clientName: 'Alana Gabriele',
    //   clientNotes: 'Quero muito relaxar!',
    //   price: 'R$ 00,00',
    //   professionalName: 'Carlos Henrique',
    //   serviceName: 'Massagem Relaxante',
    //   duration: '1h30min',
    // });
  }

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    routingKey:
      MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_NEW_APPOINTMENT_MAIL_QUEUE,
    queue: MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_NEW_APPOINTMENT_MAIL_QUEUE,
  })
  async execute({
    apptDate,
    apptTime,
    byName,
    clientNotes,
    price,
    toName,
    serviceName,
    to,
    duration,
  }: SendNewAppointmentProfessionalDto) {
    if (!to || !toName || !apptDate || !apptTime || !serviceName) {
      this.logger.error(
        'Parâmetros obrigatórios ausentes para envio de e-mail',
      );
      return;
    }
    try {
      const template = await this.prisma.mailTemplate.findFirst({
        where: {
          type: SendMailTypeEnum.NEW_APPOINTMENT,
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
        type: SendMailTypeEnum.NEW_APPOINTMENT,
        template: template.html,
        data: {
          SERVICE_NAME: serviceName,
          TO_NAME: toName,
          BY_NAME: byName,
          APPT_TIME: apptTime,
          APPT_DATE: apptDate,
          PRICE: price,
          CLIENT_NOTES: clientNotes,
          DURATION: duration,
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

      this.logger.debug(`Email de novo agendamento enviado para ${to}`);

      return;
    } catch (error) {
      this.logger.error(error);
    }
  }
}
