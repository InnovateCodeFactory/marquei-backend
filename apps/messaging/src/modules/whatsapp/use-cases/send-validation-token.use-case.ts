import { PrismaService } from '@app/shared';
import {
  SendWhatsAppTypeEnum,
  WhatsAppValidationStatusEnum,
} from '@app/shared/enum';
import { EnvSchemaType } from '@app/shared/environment';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { EncryptionService } from '@app/shared/services';
import { codeGenerator } from '@app/shared/utils';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendValidationTokenDto } from '../dto/send-validation-token.dto';
import { WhatsAppBaseService } from '../whatsapp-base.service';

type SendTextMessageResponse = {
  data?: { id?: string };
};

const TOKEN_EXPIRATION_MS = 3 * 60 * 1000;

@Injectable()
export class SendValidationTokenUseCase {
  private readonly logger = new Logger(SendValidationTokenUseCase.name);
  private readonly sessionId: string;

  constructor(
    private readonly configService: ConfigService<EnvSchemaType, true>,
    private readonly whatsappBaseService: WhatsAppBaseService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.sessionId = this.configService.getOrThrow('WHATSAPP_API_SESSION_ID');
  }

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    routingKey:
      MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS.SEND_VALIDATION_TOKEN_QUEUE,
    queue: MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS.SEND_VALIDATION_TOKEN_QUEUE,
  })
  async execute({
    phone_number,
    user_type,
    request_id,
  }: SendValidationTokenDto): Promise<void> {
    if (!phone_number) {
      this.logger.error(
        'Telefone não informado para envio do token de validação',
      );
      return;
    }

    // (Opcional) normalizar número: remover espaços, parênteses e traços.
    const phone = this.normalizePhoneNumber(phone_number);

    // Regra de negócio: 6 dígitos numéricos
    const code = codeGenerator({ onlyNumbers: true, length: 6 });

    // 1) Desativar anteriores + criar novo token ATÔMICO
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

    let createdId: string | undefined;

    try {
      await this.prisma.$transaction(async (tx) => {
        // Desativa todos os ativos anteriores (mesmo phone/type)
        await tx.whatsAppValidation.updateMany({
          where: {
            phone_number: phone,
            active: true,
            type: SendWhatsAppTypeEnum.VALIDATION_CODE,
          },
          data: { active: false },
        });

        const { encryptedData, iv } = this.encryptionService.encrypt(code);
        // Cria novo registro "PENDING"
        const created = await tx.whatsAppValidation.create({
          data: {
            phone_number: phone,
            code_ciphertext: encryptedData,
            code_iv: iv,
            type: SendWhatsAppTypeEnum.VALIDATION_CODE,
            active: true,
            expires_at: expiresAt,
            user_type,
            request_id,
          },
          select: { id: true },
        });

        createdId = created.id;
      });
    } catch (err) {
      this.logger.error(
        `Falha ao preparar token para ${phone}: ${String(err)}`,
      );
      return;
    }

    // 2) Envio WhatsApp FORA da transação (I/O externo)
    try {
      const message = `Olá! Seu código de validação é ${code}`;
      const { data }: SendTextMessageResponse =
        await this.whatsappBaseService.makeRequest({
          method: 'POST',
          endpoint: '/integrators/send-text-message',
          data: {
            phoneNumber: phone,
            message,
            sessionId: this.sessionId,
          },
        });

      const whatsappMessageId = data?.id;

      await this.prisma.whatsAppValidation.update({
        where: { id: createdId! },
        data: {
          whatsapp_message_id: whatsappMessageId,
          status: WhatsAppValidationStatusEnum.SENT,
        },
      });

      this.logger.debug(
        `Token de validação enviado (SENT) para ${phone}; msgId=${whatsappMessageId ?? 'n/a'}`,
      );
    } catch (err) {
      // Marca como FAILED, mas mantém histórico do código gerado
      await this.prisma.whatsAppValidation.update({
        where: { id: createdId! },
        data: { status: WhatsAppValidationStatusEnum.FAILED },
      });

      this.logger.error(
        `Falha ao enviar token para ${phone} (status=FAILED): ${String(err)}`,
      );

      // (Opcional) Disparar DLQ / retentativa / métrica
      // this.emitRetryEvent(phone);
    }
  }

  private normalizePhoneNumber(raw: string): string {
    // simples: remove tudo que não é dígito
    return raw.replace(/\D/g, '');
  }
}
