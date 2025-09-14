import { PrismaService } from '@app/shared';
import { SendCodeValidationMailDto } from '@app/shared/dto/messaging/mail-notifications';
import { SendMailTypeEnum } from '@app/shared/enum';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(
    private readonly rmqService: RmqService,
    private prisma: PrismaService,
  ) {}

  async sendCode(payload: SendCodeValidationMailDto): Promise<void> {
    await this.rmqService.publishToQueue({
      payload,
      routingKey:
        MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_CODE_VALIDATION_MAIL_QUEUE,
    });

    return;
  }

  async validateCode(body: {
    email: string;
    type: SendMailTypeEnum;
    code: string;
  }): Promise<boolean> {
    const record = await this.prisma.mailValidation.findFirst({
      where: {
        email: body.email,
        type: body.type,
        code: body.code,
        active: true,
        validated: false,
      },
      select: {
        id: true,
        expires_at: true,
      },
    });

    if (!record) {
      throw new BadRequestException('Código inválido');
    }

    if (record.expires_at < new Date()) {
      throw new BadRequestException('Código expirado. Solicite um novo');
    }

    await this.prisma.mailValidation.update({
      where: {
        id: record.id,
      },
      data: {
        validated: true,
        active: false,
      },
    });

    return;
  }
}
