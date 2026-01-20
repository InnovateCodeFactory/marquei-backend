import { PrismaService } from '@app/shared';
import { SendCodeValidationMailDto } from '@app/shared/dto/messaging/mail-notifications';
import { SendMailTypeEnum } from '@app/shared/enum';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { EncryptionService } from '@app/shared/services';
import { codeGenerator } from '@app/shared/utils';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { MailBaseService } from '../../mail-base.service';

// alinhar com seu enum do Prisma ou central (se existir). Aqui deixo local.
enum MailValidationStatusEnum {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  VALIDATED = 'VALIDATED',
}

const TOKEN_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutos

@Injectable()
export class SendCodeValidationMailUseCase {
  private readonly logger = new Logger(SendCodeValidationMailUseCase.name);

  constructor(
    private readonly mailBaseService: MailBaseService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    routingKey:
      MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_CODE_VALIDATION_MAIL_QUEUE,
    queue: MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_CODE_VALIDATION_MAIL_QUEUE,
  })
  async execute({
    to,
    type,
    request_id,
    user_type,
  }: SendCodeValidationMailDto): Promise<void> {
    if (!to || !type || !request_id) {
      this.logger.error(
        'Parâmetros obrigatórios ausentes para envio de e-mail',
      );
      return;
    }

    const email = this.normalizeEmail(to);
    const code = codeGenerator({ length: 6, onlyNumbers: true });
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

    console.log({ code });

    let createdId: string | undefined;

    // 1) Desativar anteriores + criar novo registro (PENDING) em transação
    try {
      await this.prisma.$transaction(async (tx) => {
        // desativa tokens ativos anteriores para mesmo email+tipo+user_type (se essa for a regra)
        await tx.mailValidation.updateMany({
          where: {
            email,
            type,
            active: true,
            // se quiser considerar user_type no agrupamento:
            user_type,
          },
          data: { active: false },
        });

        const { encryptedData, iv } = this.encryptionService.encrypt(code);

        const created = await tx.mailValidation.upsert({
          where: { request_id },
          update: {
            email,
            type,
            user_type,
            code_ciphertext: encryptedData,
            code_iv: iv,
            status: MailValidationStatusEnum.PENDING,
            active: true,
            expires_at: expiresAt,
            attempts: 0,
            validated: false,
            validated_at: null,
            message_id: null,
          },
          create: {
            request_id,
            email,
            type,
            user_type,
            code_ciphertext: encryptedData,
            code_iv: iv,
            status: MailValidationStatusEnum.PENDING,
            active: true,
            expires_at: expiresAt,
          },
          select: { id: true },
        });

        createdId = created.id;
      });
    } catch (err) {
      this.logger.error(
        `Falha ao preparar registro de validação por e-mail (${email}): ${String(err)}`,
      );
      return;
    }

    // 2) Envio do e-mail FORA da transação (I/O externo)
    try {
      const template = await this.prisma.mailTemplate.findFirst({
        where: { type: SendMailTypeEnum.VALIDATION_CODE, active: true },
        select: { subject: true, html: true, from: true, pre_header: true },
      });

      if (!template) {
        throw new Error('Template de e-mail não encontrado');
      }

      const html = this.mailBaseService.fillTemplate({
        type: SendMailTypeEnum.VALIDATION_CODE,
        template: template.html,
        data: {
          CODE: code,
          PREHEADER: template.pre_header || '',
        },
      });

      const response = await this.mailBaseService.sendMail({
        to: email,
        subject: template.subject,
        html,
        from: template.from,
      });

      if (!response?.messageId) {
        throw new Error('Envio de e-mail sem messageId');
      }

      // sucesso → SENT
      await this.prisma.mailValidation.update({
        where: { id: createdId! },
        data: {
          message_id: response.messageId,
          status: MailValidationStatusEnum.SENT,
        },
      });

      this.logger.debug(
        `Token de validação por e-mail enviado (SENT) para ${email}; msgId=${response.messageId}`,
      );
    } catch (err) {
      // falha → FAILED (mas mantém o registro criado, para auditoria e reenvio)
      await this.prisma.mailValidation.update({
        where: { id: createdId! },
        data: { status: MailValidationStatusEnum.FAILED },
      });

      this.logger.error(
        `Falha ao enviar token por e-mail para ${email} (status=FAILED): ${String(err)}`,
      );
    }
  }

  private normalizeEmail(raw: string): string {
    return raw.trim().toLowerCase();
  }
}
