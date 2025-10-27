import { PrismaService } from '@app/shared';
import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { tz } from '@date-fns/tz';
import { RegisterVisitDto } from '../dto/requests/register-visit.dto';

@Injectable()
export class RegisterVisitUseCase {
  private readonly logger = new Logger(RegisterVisitUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(payload: RegisterVisitDto & { headerDeviceToken?: string }) {
    const device_token = payload.device_token || payload.headerDeviceToken;

    if (!device_token) {
      // Soft ignore, but log for observability
      this.logger.warn('Register visit called without device_token');
      return { ok: false };
    }

    const saoPauloDate = tz(new Date(), 'America/Sao_Paulo');
    const visited_at = format(saoPauloDate, 'dd/MM/yyyy HH:mm:ssxxx');

    await this.prisma.guestVisit.create({
      data: {
        device_token,
        visited_at,
      },
    });

    return { ok: true };
  }
}

