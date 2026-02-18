import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import {
  BUSINESS_REMINDER_TYPE_DEFAULTS,
  normalizeNotificationTemplate,
} from '@app/shared/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ManageBusinessNotificationsDto } from '../dto/requests/manage-business-notifications.dto';

@Injectable()
export class ManageBusinessNotificationsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(dto: ManageBusinessNotificationsDto, req: AppRequest) {
    const businessId = req.user?.current_selected_business_id;
    if (!businessId) throw new NotFoundException('Negócio não encontrado');

    const defaults = BUSINESS_REMINDER_TYPE_DEFAULTS[dto.type];

    const updateData = {
      ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      ...(dto.channels !== undefined && { channels: dto.channels }),
      ...(dto.offsets_min_before !== undefined && {
        offsets_min_before: dto.offsets_min_before,
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
