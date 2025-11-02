import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import { ManageSelfNotificationsDto } from '../dto/requests/manage-self-notifications.dto';

@Injectable()
export class ManageSelfNotificationsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(dto: ManageSelfNotificationsDto, req: AppRequest) {
    const { push_notification, email_notification } = dto;

    await this.prismaService.professionalProfile.update({
      where: {
        id: req.user?.professional_profile_id,
      },
      data: {
        ...(push_notification !== undefined && {
          push_notification_enabled: push_notification,
        }),
        ...(email_notification !== undefined && {
          email_notification_enabled: email_notification,
        }),
      },
    });

    return null;
  }
}
