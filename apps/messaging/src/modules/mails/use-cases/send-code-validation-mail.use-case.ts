import { PrismaService } from '@app/shared';
import { SendCodeValidationMailDto } from '@app/shared/dto/messaging/mail-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { codeGenerator } from '@app/shared/utils';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { MailTemplateType } from '@prisma/client';
import { MailBaseService } from '../mail-base.service';

@Injectable()
export class SendCodeValidationMailUseCase implements OnApplicationBootstrap {
  private readonly logger = new Logger(SendCodeValidationMailUseCase.name);

  private fiveMinutesInMs = 5 * 60 * 1000;

  constructor(
    private readonly mailBaseService: MailBaseService,
    private prisma: PrismaService,
  ) {}

  async onApplicationBootstrap() {
    // await this.execute({
    //   to: 'alanagabriele43@gmail.com',
    //   // to: 'chziegler445@gmail.com',
    // });
  }
  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    routingKey:
      MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_CODE_VALIDATION_MAIL_QUEUE,
    queue: MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_CODE_VALIDATION_MAIL_QUEUE,
  })
  async execute({ to }: SendCodeValidationMailDto) {
    try {
      const [template, _] = await Promise.all([
        this.prisma.mailTemplate.findFirst({
          where: {
            type: MailTemplateType.VALIDATION_CODE,
            active: true,
          },
          select: {
            subject: true,
            html: true,
            from: true,
            pre_header: true,
          },
        }),
        this.prisma.mailValidation.updateMany({
          where: {
            type: MailTemplateType.VALIDATION_CODE,
            active: true,
          },
          data: { active: false },
        }),
      ]);

      if (!template) throw new Error('Template de email não encontrado');

      const code = codeGenerator({ length: 6, onlyNumbers: true });

      const html = this.mailBaseService.fillTemplate(template.html, {
        CODE: code,
        PREHEADER: template.pre_header || '',
      });

      const response = await this.mailBaseService.sendMail({
        to,
        subject: template.subject,
        html,
        from: template.from,
      });

      if (!response) throw new Error('Erro ao enviar email');

      await this.prisma.mailValidation.create({
        data: {
          email: to,
          code,
          expires_at: new Date(Date.now() + this.fiveMinutesInMs),
          type: MailTemplateType.VALIDATION_CODE,
          message_id: response.messageId,
        },
      });

      this.logger.debug(`Email de código de verificação enviado para: ${to}`);

      return;
    } catch (error) {
      this.logger.error(error);
    }
  }
}
