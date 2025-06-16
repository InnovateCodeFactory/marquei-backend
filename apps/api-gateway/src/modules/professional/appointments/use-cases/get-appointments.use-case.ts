import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { addHours } from 'date-fns';

@Injectable()
export class GetAppointmentsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_id)
      throw new UnauthorizedException(
        'You must select a business to view appointments.',
      );

    const currentProfessionalProfile =
      await this.prismaService.professionalProfile.findFirst({
        where: {
          userId: currentUser.id,
          business_id: currentUser.current_selected_business_id,
        },
        select: {
          id: true,
        },
      });

    if (!currentProfessionalProfile)
      throw new UnauthorizedException(
        'You must have a professional profile to view appointments.',
      );

    const appointments = await this.prismaService.appointment.findMany({
      where: {
        professionalProfileId: currentProfessionalProfile.id,
        status: {
          in: ['CONFIRMED', 'PENDING'],
        },
      },
      select: {
        customer: {
          select: {
            id: true,
            name: true,
            verified: true,
            phone: true,
          },
        },
        notes: true,
        professional: {
          select: {
            User: {
              select: {
                name: true,
              },
            },
          },
        },
        scheduled_at: true,
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price_in_cents: true,
          },
        },
        status: true,
      },
    });

    const formattedAppointments = appointments.map((appointment) => ({
      customer: {
        id: appointment.customer.id,
        name: appointment.customer.name,
        verified: appointment.customer.verified,
        phone: appointment.customer.phone,
      },
      notes: appointment.notes,
      professional: {
        name: appointment.professional.User.name,
      },
      start_date: addHours(appointment.scheduled_at, 3),
      end_date: addHours(
        new Date(
          appointment.scheduled_at.getTime() +
            appointment.service.duration * 60 * 1000, // duration in minutes
        ),
        3,
      ),
      service: {
        id: appointment.service.id,
        name: appointment.service.name,
        duration: appointment.service.duration,
        price_in_cents: appointment.service.price_in_cents,
      },
      status: appointment.status,
    }));

    return formattedAppointments;
  }
}
