import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAppointmentDto } from '../dto/requests/create-appointment.dto';

@Injectable()
export class CreateAppointmentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(payload: CreateAppointmentDto, user: CurrentUser) {
    if (!user?.current_selected_business_id) {
      throw new UnauthorizedException('User not authorized');
    }

    const {
      appointment_date,
      customer_id,
      professional_id,
      service_id,
      notes,
    } = payload;

    // Validate all entities in parallel
    const [service, professional, bc] = await Promise.all([
      // 1) Service do negócio?
      this.prisma.service.findFirst({
        where: {
          id: service_id,
          businessId: user.current_selected_business_id,
        },
        select: { id: true },
      }),
      // 2) Professional do negócio?
      this.prisma.professionalProfile.findFirst({
        where: {
          id: professional_id,
          business_id: user.current_selected_business_id,
        },
        select: { id: true },
      }),
      // 3) BusinessCustomer do negócio? (customer_id = BusinessCustomer.id)
      this.prisma.businessCustomer.findFirst({
        where: {
          id: customer_id,
          businessId: user.current_selected_business_id,
        },
        select: { personId: true },
      }),
    ]);

    if (!service) {
      throw new UnauthorizedException(
        'O serviço não pertence ao negócio selecionado',
      );
    }
    if (!professional) {
      throw new UnauthorizedException(
        'O profissional não pertence ao negócio selecionado',
      );
    }
    if (!bc) {
      throw new BadRequestException(
        'O cliente informado não pertence ao negócio selecionado',
      );
    }

    // 4) Horário já tomado para o mesmo profissional?
    const isTheDateTaken = await this.prisma.appointment.findFirst({
      where: {
        scheduled_at: new Date(appointment_date),
        professionalProfileId: professional_id,
      },
      select: { id: true },
    });
    if (isTheDateTaken) {
      throw new BadRequestException(
        'Já existe um agendamento para essa data e horário com esse profissional.',
      );
    }

    // 5) Cria agendamento vinculando a Person do cliente
    await this.prisma.appointment.create({
      data: {
        status: 'PENDING',
        scheduled_at: new Date(appointment_date),
        professional: { connect: { id: professional_id } },
        service: { connect: { id: service_id } },
        customerPerson: { connect: { id: bc.personId } }, // 👈 vínculo do cliente
        notes: notes || null,
        events: [
          {
            type: 'PENDING',
            created_at: new Date(),
            by_professional: true,
            by_user_id: user.id,
            reason: null,
          },
        ],
      },
    });

    // to do - enviar email e push notification (se tiver o app) para o cliente

    return null;
  }
}
