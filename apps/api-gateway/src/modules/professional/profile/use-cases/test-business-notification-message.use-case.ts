import { PrismaService } from '@app/shared';
import { getSystemSetting } from '@app/shared/config/system-general-settings';
import { SendWhatsAppTextMessageDto } from '@app/shared/dto/messaging/whatsapp-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import {
  normalizeNotificationTemplate,
  renderBusinessNotificationTemplate,
} from '@app/shared/utils';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TestBusinessNotificationMessageDto } from '../dto/requests/test-business-notification-message.dto';

type ChannelTestResult = {
  attempted: boolean;
  sent: boolean;
  reason: string | null;
};

@Injectable()
export class TestBusinessNotificationMessageUseCase {
  private readonly logger = new Logger(
    TestBusinessNotificationMessageUseCase.name,
  );

  constructor(
    private readonly prismaService: PrismaService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(dto: TestBusinessNotificationMessageDto, req: AppRequest) {
    const businessId = req.user?.current_selected_business_id;
    const userId = req.user?.id;

    if (!businessId || !userId) {
      throw new NotFoundException('Negócio não encontrado');
    }

    const template = normalizeNotificationTemplate(dto.message_template);
    if (!template) {
      throw new BadRequestException('Digite uma mensagem para realizar o teste.');
    }

    const [business, user] = await Promise.all([
      this.prismaService.business.findUnique({
        where: { id: businessId },
        select: { id: true, name: true },
      }),
      this.prismaService.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          person: {
            select: { phone: true },
          },
          professional_profile: {
            where: { business_id: businessId },
            select: { phone: true },
            take: 1,
          },
        },
      }),
    ]);

    if (!business || !user) {
      throw new NotFoundException('Dados para teste não encontrados.');
    }

    const clientUrl = getSystemSetting('website_client_url') || '';
    const defaultConfirmationAction = clientUrl
      ? `Para confirmar, é só acessar o link:\n${clientUrl}`
      : 'Para confirmar, basta acessar o aplicativo.';

    const renderedMessage = renderBusinessNotificationTemplate({
      template,
      variables: {
        business_name: business.name || 'Marquei',
        customer_name: 'Maria',
        professional_name: user.name || 'Profissional',
        service_name: 'Serviço',
        day: '12/03',
        day_with_preposition: 'amanhã',
        time: '14:30',
        client_app_url: clientUrl,
        confirmation_action: defaultConfirmationAction,
        signup_hint: '',
        ios_app_url: '',
        android_app_url: '',
        app_download_links: '',
      },
    });

    if (!renderedMessage) {
      throw new BadRequestException(
        'Não foi possível gerar a mensagem de teste com o template informado.',
      );
    }

    const rawPhone =
      user.professional_profile?.[0]?.phone?.trim() ||
      user.person?.phone?.trim() ||
      null;
    const phoneNumber = rawPhone ? this.normalizePhoneNumber(rawPhone) : null;

    const whatsapp: ChannelTestResult = {
      attempted: false,
      sent: false,
      reason: null,
    };

    if (phoneNumber) {
      whatsapp.attempted = true;
      try {
        await this.rmqService.publishToQueue({
          routingKey:
            MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS.SEND_TEXT_MESSAGE_QUEUE,
          payload: new SendWhatsAppTextMessageDto({
            phone_number: phoneNumber,
            message: renderedMessage,
          }),
        });
        whatsapp.sent = true;
      } catch (error) {
        whatsapp.reason = 'Falha ao enfileirar teste por WhatsApp.';
        this.logger.error(
          `Error while queuing WhatsApp test message for user ${user.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } else {
      whatsapp.reason = 'Telefone não encontrado.';
    }

    return {
      cooldown_seconds: 30,
      preview_message: renderedMessage,
      whatsapp: {
        ...whatsapp,
        destination: phoneNumber ? this.maskPhone(phoneNumber) : null,
      },
    };
  }

  private maskPhone(raw: string) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    return `${'*'.repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}`;
  }

  private normalizePhoneNumber(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    const normalized = digits.replace(/^0+/, '');
    if (
      (normalized.length === 12 || normalized.length === 13) &&
      normalized.startsWith('55')
    ) {
      return normalized;
    }
    if (normalized.length === 10 || normalized.length === 11) {
      return `55${normalized}`;
    }
    return normalized.startsWith('55') ? normalized : `55${normalized}`;
  }
}
