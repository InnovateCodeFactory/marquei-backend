import { PrismaService } from '@app/shared';
import { tz } from '@date-fns/tz';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { RegisterVisitDto } from '../dto/requests/register-visit.dto';

@Injectable()
export class RegisterVisitUseCase {
  private readonly logger = new Logger(RegisterVisitUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(payload: RegisterVisitDto & { headerDeviceToken?: string }) {
    const device_token = (payload.headerDeviceToken || '').trim();
    if (!device_token) {
      this.logger.warn('Register visit called without device_token');
      throw new BadRequestException('Missing device_token');
    }

    const IN_TZ = tz('America/Sao_Paulo');
    const visited_at = format(new Date(), 'dd/MM/yyyy HH:mm:ssxxx', {
      in: IN_TZ,
    });

    // guarantee guest exists (token must be created on first-access and reused)
    const guest = await this.prisma.guest.findUnique({
      where: { device_token },
      select: { id: true },
    });
    if (!guest) {
      this.logger.warn(
        `Register visit: guest not found for token ${device_token}`,
      );
      return { ok: false, error: 'guest_not_found' } as const;
    }

    await this.prisma.guestVisit.create({
      data: {
        device_token,
        visited_at,
      },
    });

    return { ok: true };
  }
}
