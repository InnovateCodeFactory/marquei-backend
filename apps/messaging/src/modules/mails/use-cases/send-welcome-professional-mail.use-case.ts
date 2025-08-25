import { PrismaService } from '@app/shared';
import { SendWelcomeMailDto } from '@app/shared/dto/messaging/mail-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { MailTemplateType } from '@prisma/client';
import { MailBaseService } from '../mail-base.service';

@Injectable()
export class SendWelcomeProfessionalMailUseCase
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(SendWelcomeProfessionalMailUseCase.name);

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
    routingKey: MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_WELCOME_MAIL_QUEUE,
    queue: MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_WELCOME_MAIL_QUEUE,
  })
  async execute({ to, firstName }: SendWelcomeMailDto) {
    try {
      const template = await this.prisma.mailTemplate.findFirst({
        where: {
          type: MailTemplateType.WELCOME_PROFESSIONAL,
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

      const html = this.mailBaseService.fillTemplate(template.html, {
        NAME: firstName,
        PREHEADER: template.pre_header || '',
      });

      const response = await this.mailBaseService.sendMail({
        to,
        subject: template.subject,
        html,
        from: template.from,
      });

      if (!response) throw new Error('Erro ao enviar email');

      this.logger.debug(`Email de boas-vindas enviado para: ${to}`);

      return;
    } catch (error) {
      this.logger.error(error);
    }
  }
}
