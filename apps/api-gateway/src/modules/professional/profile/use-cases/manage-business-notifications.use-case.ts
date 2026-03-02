import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import {
  BUSINESS_REMINDER_TYPE_DEFAULTS,
  normalizeNotificationTemplate,
} from '@app/shared/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessReminderType, ReminderChannel } from '@prisma/client';
import { ManageBusinessNotificationsDto } from '../dto/requests/manage-business-notifications.dto';

@Injectable()
export class ManageBusinessNotificationsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  private normalizeChannels(dto: ManageBusinessNotificationsDto) {
    if (!dto.channels) return undefined;

    if (dto.type === BusinessReminderType.APPOINTMENT_CONFIRMATION_REQUEST) {
      return [ReminderChannel.WHATSAPP];
    }

    const uniqueChannels = Array.from(new Set(dto.channels));
    return uniqueChannels.length ? uniqueChannels : undefined;
  }

  private normalizeOffsets(dto: ManageBusinessNotificationsDto) {
    if (dto.type === BusinessReminderType.APPOINTMENT_CONFIRMATION_REQUEST) {
      return [];
    }

    if (!dto.offsets_min_before) return undefined;
    const uniqueOffsets = Array.from(
      new Set(dto.offsets_min_before.filter((offset) => Number.isFinite(offset))),
    )
      .map((offset) => Number(offset))
      .filter((offset) => offset > 0)
      .sort((a, b) => b - a);

    return uniqueOffsets.length ? uniqueOffsets : undefined;
  }

  async execute(dto: ManageBusinessNotificationsDto, req: AppRequest) {
    const businessId = req.user?.current_selected_business_id;
    if (!businessId) throw new NotFoundException('Negócio não encontrado');

    const defaults = BUSINESS_REMINDER_TYPE_DEFAULTS[dto.type];

    const normalizedChannels = this.normalizeChannels(dto);
    const normalizedOffsets = this.normalizeOffsets(dto);

    const updateData = {
      ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      ...(normalizedChannels !== undefined && { channels: normalizedChannels }),
      ...(normalizedOffsets !== undefined && {
        offsets_min_before: normalizedOffsets,
      }),
      ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      ...(dto.message_template !== undefined && {
        message_template:
          normalizeNotificationTemplate(dto.message_template) ??
          defaults.message_template,
      }),
    };

    if (!Object.keys(updateData).length) return null;

    const existing = await this.prismaService.businessReminderSettings.findFirst({
      where: {
        businessId,
        type: dto.type,
      },
      select: { id: true },
    });

    if (existing) {
      await this.prismaService.businessReminderSettings.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      await this.prismaService.businessReminderSettings.create({
        data: {
          businessId,
          type: dto.type,
          ...defaults,
          ...updateData,
        },
      });
    }

    return null;
  }
}
