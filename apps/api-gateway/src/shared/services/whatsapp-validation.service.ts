import { PrismaService } from '@app/shared';
import { UserTypeEnum } from '@app/shared/enum';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { EncryptionService } from '@app/shared/services';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

enum WhatsAppValidationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  VALIDATED = 'VALIDATED',
}

enum WhatsAppValidationEventType {
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

type SendCodePayload = {
  phone_number: string;
  user_type: UserTypeEnum;
  request_id: string;
};

@Injectable()
export class WhatsAppValidationService {
  private readonly logger = new Logger(WhatsAppValidationService.name);

  // regra de bloqueio por tentativas (ajuste como preferir)
  private static readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly rmqService: RmqService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService, // deve suportar encrypt/decrypt com IV
  ) {}

  // -----------------------------------------------------------------------
  // ENVIAR CÓDIGO (apenas publica; quem gera/salva o token é o consumidor)
  // -----------------------------------------------------------------------
  async sendCode(payload: SendCodePayload) {
    if (!payload?.phone_number || !payload?.user_type || !payload?.request_id) {
      throw new BadRequestException('Parâmetros obrigatórios ausentes');
    }

    // normaliza telefone (só dígitos)
    const phone = payload.phone_number.replace(/\D/g, '');
    if (phone.length < 10) throw new BadRequestException('Telefone inválido');

    await this.rmqService.publishToQueue({
      routingKey:
        MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS.SEND_VALIDATION_TOKEN_QUEUE,
      payload: { ...payload, phone_number: phone },
    });

    this.logger.debug(
      `Solicitado envio de token: request_id=${payload.request_id} phone=${phone}`,
    );
  }

  // -----------------------------------------------------------------------
  // VALIDAR CÓDIGO
  // -----------------------------------------------------------------------
  async validateCode({
    code,
    request_id,
    ip,
    user_agent,
  }: {
    code: string;
    request_id: string;
    ip?: string;
    user_agent?: string;
  }) {
    if (!code || !request_id) {
      throw new BadRequestException('Código e request_id são obrigatórios');
    }

    const now = new Date();

    // Busca o registro (request_id é único no teu schema)
    const record = await this.prisma.whatsAppValidation.findUnique({
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
      // não existe
      throw new BadRequestException('Código inválido');
    }

    // expirado?
    if (record.expires_at <= now) {
      await this.safeExpire(record.id);
      await this.appendEvent(record.id, {
        type: WhatsAppValidationEventType.EXPIRED,
        message: 'Token expirado no momento da validação',
        ip,
        user_agent,
        code,
      });
      throw new BadRequestException('Código expirado. Solicite um novo');
    }
    // já validado / status não pendente?
    if (record.status !== WhatsAppValidationStatus.SENT) {
      throw new BadRequestException('Código inválido');
    }

    // bloqueado por excesso?
    if (record.attempts >= WhatsAppValidationService.MAX_ATTEMPTS) {
      await this.blockRecord(record.id);
      await this.appendEvent(record.id, {
        type: WhatsAppValidationEventType.BLOCKED,
        message: `Excedeu tentativas (${record.attempts})`,
        ip,
        user_agent,
        code,
      });
      throw new BadRequestException(
        'Muitas tentativas. Solicite um novo código',
      );
    }

    const plaintext = this.encryption.decrypt({
      encryptedText: record.code_ciphertext,
      iv: record.code_iv,
    });

    const isMatch = plaintext === code;

    // registra tentativa (sempre)
    await this.appendEvent(record.id, {
      type: WhatsAppValidationEventType.VALIDATION_ATTEMPT,
      message: isMatch
        ? 'Tentativa com código correto'
        : 'Tentativa com código incorreto',
      ip,
      user_agent,
      metadata: {
        // log leve e sem plaintext persistido
        provided_masked: this.maskCode(code),
      },
      attemptNo: record.attempts + 1,
      code,
    });

    if (!isMatch) {
      // incrementa tentativa e avalia bloqueio
      const updated = await this.prisma.whatsAppValidation.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true },
      });

      if (updated.attempts >= WhatsAppValidationService.MAX_ATTEMPTS) {
        await this.blockRecord(record.id);
        await this.appendEvent(record.id, {
          type: WhatsAppValidationEventType.BLOCKED,
          message: `Excedeu tentativas (${updated.attempts})`,
          ip,
          user_agent,
          code,
        });
      } else {
        await this.appendEvent(record.id, {
          type: WhatsAppValidationEventType.VALIDATION_FAILED,
          message: 'Código incorreto',
          ip,
          user_agent,
          attemptNo: updated.attempts,
          code,
        });
      }

      throw new BadRequestException('Código inválido');
    }

    // --- Consumo atômico ---
    // Evita corrida: só valida se ainda estiver PENDING e não expirado.
    await this.prisma.whatsAppValidation.update({
      where: {
        id: record.id,
      },
      data: {
        status: WhatsAppValidationStatus.VALIDATED,
        validated: true,
        active: false,
        validated_at: now,
        attempts: { increment: 1 }, // conta a tentativa que validou
      },
    });

    await this.appendEvent(record.id, {
      type: WhatsAppValidationEventType.VALIDATION_SUCCESS,
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
    await this.prisma.whatsAppValidation.updateMany({
      where: {
        id,
        status: WhatsAppValidationStatus.PENDING,
      },
      data: {
        status: WhatsAppValidationStatus.FAILED, // ou crie um status EXPIRED se quiser
        active: false,
      },
    });
  }

  private async blockRecord(id: string) {
    await this.prisma.whatsAppValidation.update({
      where: { id },
      data: {
        status: WhatsAppValidationStatus.FAILED, // se preferir, adicione BLOCKED no enum
        active: false,
      },
    });
  }

  private async appendEvent(
    validationId: string,
    params: {
      type: WhatsAppValidationEventType;
      code: string;
      message?: string;
      attemptNo?: number;
      ip?: string;
      user_agent?: string;
      metadata?: any;
    },
  ) {
    const { encryptedData, iv } = this.encryption.encrypt(params.code);

    await this.prisma.whatsAppValidationEvent.create({
      data: {
        whatsAppValidationId: validationId,
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
    // mantém 2 últimos dígitos visíveis
    return code.replace(/.(?=.{2}$)/g, '*');
  }
}
