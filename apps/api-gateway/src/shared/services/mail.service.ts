import { PrismaService } from '@app/shared';
import { SendCodeValidationMailDto } from '@app/shared/dto/messaging/mail-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { EncryptionService } from '@app/shared/services';
import { codeGenerator } from '@app/shared/utils';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

enum EmailValidationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  VALIDATED = 'VALIDATED',
}

enum EmailValidationEventType {
  CREATED = 'CREATED',
  SENT_REQUEST = 'SENT_REQUEST',
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',
  VALIDATION_ATTEMPT = 'VALIDATION_ATTEMPT',
  VALIDATION_SUCCESS = 'VALIDATION_SUCCESS',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  EXPIRED = 'EXPIRED',
  BLOCKED = 'BLOCKED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

type ValidateCodeInput = {
  request_id: string;
  code: string;
  ip?: string;
  user_agent?: string;
};

@Injectable()
export class MailValidationService {
  private readonly logger = new Logger(MailValidationService.name);
  private static readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly rmqService: RmqService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  // -----------------------------------------------------------------------
  // ENVIAR CÓDIGO (publica para o worker gerar/salvar e enviar e-mail)
  // -----------------------------------------------------------------------
  async sendCode({
    to,
    type,
    request_id,
    user_type,
  }: SendCodeValidationMailDto): Promise<void> {
    if (!to || !type) {
      throw new BadRequestException('Parâmetros obrigatórios ausentes');
    }

    if (!request_id) {
      request_id = codeGenerator({
        length: 32,
      });
    }

    await this.rmqService.publishToQueue({
      routingKey:
        MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_CODE_VALIDATION_MAIL_QUEUE,
      payload: { to, type, request_id, user_type },
    });

    this.logger.debug(
      `Solicitado envio de código por e-mail: to=${to}, type=${type}`,
    );
  }

  // -----------------------------------------------------------------------
  // VALIDAR CÓDIGO (espelhado ao WhatsApp)
  // -----------------------------------------------------------------------
  async validateCode({
    request_id,
    code,
    ip,
    user_agent,
  }: ValidateCodeInput): Promise<boolean> {
    if (!request_id || !code) {
      throw new BadRequestException('Código e request_id são obrigatórios');
    }

    const now = new Date();

    // request_id é único no schema
    const record = await this.prisma.mailValidation.findUnique({
      where: { request_id },
      select: {
        id: true,
        status: true,
        attempts: true,
        expires_at: true,
        validated_at: true,
        code_ciphertext: true,
        code_iv: true,
      },
    });

    if (!record) {
      throw new BadRequestException('Código inválido');
    }

    // expirado?
    if (record.expires_at <= now) {
      await this.safeExpire(record.id);
      await this.appendEvent(record.id, {
        type: EmailValidationEventType.EXPIRED,
        message: 'Token expirado no momento da validação',
        ip,
        user_agent,
        code,
      });
      throw new BadRequestException('Código expirado. Solicite um novo');
    }

    // precisa estar SENT (ou PENDING, conforme seu produtor) — aqui sigo igual ao WhatsApp
    if (record.status !== EmailValidationStatus.SENT) {
      throw new BadRequestException('Código inválido');
    }

    // bloqueado?
    if (record.attempts >= MailValidationService.MAX_ATTEMPTS) {
      await this.blockRecord(record.id);
      await this.appendEvent(record.id, {
        type: EmailValidationEventType.BLOCKED,
        message: `Excedeu tentativas (${record.attempts})`,
        ip,
        user_agent,
        code,
      });
      throw new BadRequestException(
        'Muitas tentativas. Solicite um novo código',
      );
    }

    // compara sem plaintext no banco
    const plaintext = this.encryption.decrypt({
      encryptedText: record.code_ciphertext,
      iv: record.code_iv,
    });
    const isMatch = plaintext === code;

    // registra tentativa (sempre)
    await this.appendEvent(record.id, {
      type: EmailValidationEventType.VALIDATION_ATTEMPT,
      message: isMatch
        ? 'Tentativa com código correto'
        : 'Tentativa com código incorreto',
      ip,
      user_agent,
      metadata: { provided_masked: this.maskCode(code) },
      attemptNo: record.attempts + 1,
      code,
    });

    if (!isMatch) {
      const updated = await this.prisma.mailValidation.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true },
      });

      if (updated.attempts >= MailValidationService.MAX_ATTEMPTS) {
        await this.blockRecord(record.id);
        await this.appendEvent(record.id, {
          type: EmailValidationEventType.BLOCKED,
          message: `Excedeu tentativas (${updated.attempts})`,
          ip,
          user_agent,
          code,
        });
      } else {
        await this.appendEvent(record.id, {
          type: EmailValidationEventType.VALIDATION_FAILED,
          message: 'Código incorreto',
          ip,
          user_agent,
          attemptNo: updated.attempts,
          code,
        });
      }

      throw new BadRequestException('Código inválido');
    }

    // Consumo (idempotente o suficiente, dado where por id único)
    await this.prisma.mailValidation.update({
      where: { id: record.id },
      data: {
        status: EmailValidationStatus.VALIDATED,
        validated: true,
        active: false,
        validated_at: now,
        attempts: { increment: 1 },
      },
    });

    await this.appendEvent(record.id, {
      type: EmailValidationEventType.VALIDATION_SUCCESS,
      message: 'Token validado com sucesso',
      ip,
      user_agent,
      attemptNo: record.attempts + 1,
      code,
    });

    return true;
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  private async safeExpire(id: string) {
    await this.prisma.mailValidation.updateMany({
      where: { id, status: EmailValidationStatus.PENDING },
      data: { status: EmailValidationStatus.FAILED, active: false },
    });
  }

  private async blockRecord(id: string) {
    await this.prisma.mailValidation.update({
      where: { id },
      data: { status: EmailValidationStatus.FAILED, active: false },
    });
  }

  private async appendEvent(
    validationId: string,
    params: {
      type: EmailValidationEventType;
      code: string;
      message?: string;
      attemptNo?: number;
      ip?: string;
      user_agent?: string;
      metadata?: any;
    },
  ) {
    const { encryptedData, iv } = this.encryption.encrypt(params.code);

    await this.prisma.mailValidationEvent.create({
      data: {
        mailValidationId: validationId,
        event_type: params.type,
        message: params.message?.slice(0, 255),
        attempt_no: params.attemptNo,
        ip: params.ip,
        user_agent: params.user_agent,
        metadata: params.metadata,
        code_ciphertext: encryptedData,
        code_iv: iv,
      },
    });
  }

  private maskCode(code: string) {
    return code.replace(/.(?=.{2}$)/g, '*');
  }
}
