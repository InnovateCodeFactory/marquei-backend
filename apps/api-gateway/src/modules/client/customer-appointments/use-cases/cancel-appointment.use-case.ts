import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CancelCustomerAppointmentDto } from '../dto/requests/cancel-appointment.dto';

@Injectable()
export class CancelCustomerAppointmentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(body: CancelCustomerAppointmentDto, req: AppRequest) {
    const { appointment_id, reason } = body;
    const { user, headers } = req;

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointment_id, personId: user.personId ?? undefined },
      select: { id: true, status: true },
    });
    if (!appointment)
      throw new BadRequestException('Agendamento não encontrado');

    if (appointment.status === 'CANCELED') return null;

    await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CANCELED' },
      }),
      this.prisma.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          by_professional: false,
          event_type: 'CANCELED',
          by_user_id: user.id,
          reason: reason ?? undefined,
          ip: getClientIp(req),
          user_agent: headers['user-agent'],
        },
      }),
    ]);

    return null;
  }
}
