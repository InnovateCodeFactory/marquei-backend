import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CancelAppointmentDto } from '../dto/requests/cancel-appointment.dto';

@Injectable()
export class CancelAppointmentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(body: CancelAppointmentDto, user: CurrentUser) {
    const { appointment_id } = body;

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointment_id },
      select: {
        id: true,
        status: true,
        professional: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new BadRequestException('Agendamento não encontrado');
    }

    if (appointment.status === 'CANCELED') {
      throw new BadRequestException('Agendamento já está cancelado');
    }

    await this.prisma.appointment.update({
      where: { id: appointment_id },
      data: {
        status: 'CANCELED',
        events: {
          push: {
            type: 'CANCELED',
            created_at: new Date(),
            by_professional: true,
            by_user_id: user.id,
            reason: body.reason || null,
          },
        },
      },
    });

    return;
  }
}
