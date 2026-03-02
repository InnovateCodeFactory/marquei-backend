import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import {
  BUSINESS_NOTIFICATION_TEMPLATE_VARIABLES,
  BUSINESS_REMINDER_TYPE_DEFAULTS,
  BUSINESS_REMINDER_TYPES,
  normalizeNotificationTemplate,
} from '@app/shared/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessReminderType, ReminderChannel } from '@prisma/client';

@Injectable()
export class GetBusinessNotificationsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  private async ensureDefaultsForBusiness(businessId: string) {
    const existing = await this.prismaService.businessReminderSettings.findMany({
      where: { businessId },
      select: { type: true },
    });
    const existingTypes = new Set(existing.map((item) => item.type));

    const toCreate = BUSINESS_REMINDER_TYPES.filter(
      (type) => !existingTypes.has(type),
    );

    if (!toCreate.length) return;

    await this.prismaService.businessReminderSettings.createMany({
      data: toCreate.map((type) => ({
        businessId,
        type,
        is_active: BUSINESS_REMINDER_TYPE_DEFAULTS[type].is_active,
        channels: BUSINESS_REMINDER_TYPE_DEFAULTS[type].channels,
        offsets_min_before:
          BUSINESS_REMINDER_TYPE_DEFAULTS[type].offsets_min_before,
        timezone: BUSINESS_REMINDER_TYPE_DEFAULTS[type].timezone,
        message_template:
          normalizeNotificationTemplate(
            BUSINESS_REMINDER_TYPE_DEFAULTS[type].message_template,
          ) ?? BUSINESS_REMINDER_TYPE_DEFAULTS[type].message_template,
      })),
    });
  }

  async execute(req: AppRequest) {
    const businessId = req.user?.current_selected_business_id;
    if (!businessId) throw new NotFoundException('Negócio não encontrado');
    const professionalName = req.user?.name?.trim() || 'Profissional';

    await this.ensureDefaultsForBusiness(businessId);

    const business = await this.prismaService.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    });
    const businessName = business?.name?.trim() || 'Seu negócio';

    const settings = await this.prismaService.businessReminderSettings.findMany({
      where: { businessId },
      select: {
        type: true,
        is_active: true,
        channels: true,
        timezone: true,
        offsets_min_before: true,
        message_template: true,
      },
      orderBy: { created_at: 'asc' },
    });

    const byType = new Map(settings.map((item) => [item.type, item]));
    const hiddenVariableKeys = new Set([
      'day',
      'ios_app_url',
      'android_app_url',
      'signup_hint',
      'app_download_links',
      'client_app_url',
      'confirmation_action',
    ]);

    const reminder_types = BUSINESS_REMINDER_TYPES.map((type) => {
      const current = byType.get(type);
      const defaults = BUSINESS_REMINDER_TYPE_DEFAULTS[type];
      const isConfirmationType =
        type === BusinessReminderType.APPOINTMENT_CONFIRMATION_REQUEST;

      const currentChannels = current?.channels ?? defaults.channels;
      const channels = isConfirmationType
        ? [ReminderChannel.WHATSAPP]
        : currentChannels;

      const currentOffsets =
        current?.offsets_min_before ?? defaults.offsets_min_before;
      const offsets = isConfirmationType ? [] : currentOffsets;

      return {
        type,
        title: defaults.title,
        description: defaults.description,
        is_active: current?.is_active ?? defaults.is_active,
        channels,
        offsets_min_before: offsets,
        timezone: current?.timezone ?? defaults.timezone,
        message_template: current?.message_template ?? defaults.message_template,
      };
    });

    return {
      reminder_types,
      available_variables: BUSINESS_NOTIFICATION_TEMPLATE_VARIABLES
        .filter((variable) => !hiddenVariableKeys.has(variable.key))
        .map((variable) => {
          if (variable.key === 'business_name') {
            return {
              ...variable,
              example: businessName,
            };
          }

          if (variable.key === 'professional_name') {
            return {
              ...variable,
              example: professionalName,
            };
          }

          return variable;
        }),
      reminder_type_options: [
        {
          type: BusinessReminderType.APPOINTMENT_REMINDER,
          label: 'Lembrete automático',
        },
        {
          type: BusinessReminderType.APPOINTMENT_CONFIRMATION_REQUEST,
          label: 'Solicitação de confirmação',
        },
      ],
    };
  }
}
