import { SendWhatsAppTextMessageDto } from '@app/shared/dto/messaging/whatsapp-notifications';
import { EnvSchemaType } from '@app/shared/environment';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RABBIT_EXCHANGE } from '@app/shared/modules/rmq/rmq.service';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppBaseService } from '../whatsapp-base.service';

type SendTextMessageResponse = {
  data?: { id?: string };
};

@Injectable()
export class SendWhatsAppTextMessageUseCase {
  private readonly logger = new Logger(SendWhatsAppTextMessageUseCase.name);
  private readonly sessionId: string;

  constructor(
    private readonly whatsappBaseService: WhatsAppBaseService,
    private readonly configService: ConfigService<EnvSchemaType>,
  ) {
    this.sessionId = this.configService.getOrThrow('WHATSAPP_API_SESSION_ID');
  }

  @RabbitSubscribe({
    exchange: RABBIT_EXCHANGE,
    routingKey: MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS.SEND_TEXT_MESSAGE_QUEUE,
    queue: MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS.SEND_TEXT_MESSAGE_QUEUE,
  })
  async execute(payload: SendWhatsAppTextMessageDto): Promise<void> {
    try {
      const { phone_number, message } = payload;

      if (!phone_number || !message) {
        this.logger.error(
          'Telefone ou mensagem não informados para envio da mensagem de texto: ',
          payload,
        );
        return;
      }

      const { data }: SendTextMessageResponse =
        await this.whatsappBaseService.makeRequest({
          method: 'POST',
          endpoint: '/integrators/send-text-message',
          data: {
            phoneNumber: phone_number,
            message,
            sessionId: this.sessionId,
          },
        });

      if (!data?.id) {
        this.logger.error(
          'Falha ao enviar mensagem de texto via WhatsApp, ID da mensagem não retornado: ',
          payload,
        );
        return;
      }

      this.logger.log(
        `Mensagem de texto enviada via WhatsApp com sucesso. ID da mensagem: ${data.id}`,
      );
    } catch (error) {
      this.logger.error(
        'Erro ao enviar mensagem de texto via WhatsApp: ',
        error?.response?.data || error.message || error,
      );
    }
  }
}
