import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateAppointmentDto } from '../dto/requests/create-appointment.dto';

@Injectable()
export class CreateAppointmentUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: CreateAppointmentDto, user: CurrentUser) {
    if (!user || !user?.current_selected_business_id)
      throw new UnauthorizedException('User not authorized');
    const {
      appointment_date,
      customer_id,
      professional_id,
      service_id,
      notes,
    } = payload;

    const isTheServiceFromTheSelectedBusiness =
      await this.prismaService.service.findFirst({
        where: {
          id: service_id,
          businessId: user.current_selected_business_id,
        },
        select: {
          id: true,
        },
      });

    if (!isTheServiceFromTheSelectedBusiness) {
      throw new UnauthorizedException(
        'This service does not belong to the selected business',
      );
    }

    await this.prismaService.appointment.create({
      data: {
        status: 'PENDING',
        professional: {
          connect: { id: professional_id },
        },
        scheduled_at: appointment_date,
        customer: {
          connect: { id: customer_id },
        },
        service: {
          connect: { id: service_id },
        },
        notes,
      },
    });
  }
}
