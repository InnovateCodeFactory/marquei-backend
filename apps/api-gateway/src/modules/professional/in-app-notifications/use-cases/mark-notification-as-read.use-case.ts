import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MarkNotificationAsReadDto } from '../dto/mark-notification-as-read.dto';

@Injectable()
export class MarkNotificationAsReadUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: MarkNotificationAsReadDto, user: CurrentUser) {
    const { notificationId } = payload;

    // Verificar se a notificação existe e pertence ao profissional
    const notification = await this.prismaService.inAppNotification.findFirst({
      where: {
        id: notificationId,
        professional_profile: {
          userId: user.id,
        },
      },
      select: {
        id: true,
        read: true,
      },
    });

    if (!notification) {
      throw new NotFoundException(
        'Notificação não encontrada ou não pertence a este usuário',
      );
    }

    // Se já estiver lida, retornar sem fazer nada
    if (notification.read) {
      return null;
    }

    // Marcar como lida
    await this.prismaService.inAppNotification.update({
      where: {
        id: notificationId,
      },
      data: {
        read: true,
      },
    });

    return null;
  }
}
