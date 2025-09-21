import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfirmAppointmentDto } from '../dto/requests/confirm-appointment.dto';

@Injectable()
export class ConfirmCustomerAppointmentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(body: ConfirmAppointmentDto, req: AppRequest) {
    const { appointment_id } = body;
    const { user, headers } = req;

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointment_id, personId: user.personId ?? undefined },
      select: { id: true, status: true },
    });
    if (!appointment) throw new BadRequestException('Agendamento não encontrado');

    if (appointment.status === 'CANCELED')
      throw new BadRequestException('Agendamento já cancelado');

    if (appointment.status === 'CONFIRMED') return null; // no-op

    await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CONFIRMED' },
      }),
      this.prisma.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          by_professional: false,
          event_type: 'CONFIRMED',
          by_user_id: user.id,
          ip: getClientIp(req),
          user_agent: headers['user-agent'],
        },
      }),
    ]);

    return null;
  }
}

