import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfirmAppointmentDto } from '../dto/requests/confirm-appointment.dto';

@Injectable()
export class ConfirmAppointmentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(body: ConfirmAppointmentDto, req: AppRequest) {
    const { appointment_id } = body;
    const { user, headers } = req;

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointment_id },
      select: {
        id: true,
        status: true,
        professional: {
          select: {
            business_id: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new BadRequestException('Agendamento não encontrado');
    }

    if (
      appointment.professional?.business_id !==
      user.current_selected_business_id
    ) {
      throw new ForbiddenException(
        'O profissional não pode confirmar este agendamento',
      );
    }

    if (appointment.status === 'CANCELED') {
      throw new BadRequestException('Agendamento cancelado não pode ser confirmado');
    }

    if (appointment.status === 'COMPLETED') {
      throw new BadRequestException('Agendamento concluído não pode ser confirmado');
    }

    if (appointment.status === 'CONFIRMED') {
      return null;
    }

    await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CONFIRMED' },
      }),
      this.prisma.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          event_type: 'CONFIRMED',
          by_professional: true,
          by_user_id: user.id,
          reason: 'manual_confirmation',
          ip: getClientIp(req),
          user_agent: headers['user-agent'],
        },
      }),
    ]);

    return null;
  }
}

