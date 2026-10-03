import { PrismaService } from '@app/shared';
import { RecurringAppointmentsService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateCustomerRecurringAppointmentDto } from '../dto/requests/create-recurring-appointment.dto';

@Injectable()
export class CreateCustomerRecurringAppointmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recurringAppointmentsService: RecurringAppointmentsService,
  ) {}

  async execute(payload: CreateCustomerRecurringAppointmentDto, req: AppRequest) {
    const { user } = req;

    if (!user?.personId || user.user_type !== 'CUSTOMER') {
      throw new UnauthorizedException('User not authorized');
    }

    const professional = await this.prisma.professionalProfile.findUnique({
      where: { id: payload.professional_id },
      select: { business_id: true },
    });

    if (!professional) {
      throw new BadRequestException('Profissional inválido para recorrência.');
    }

    const customer = await this.prisma.businessCustomer.findFirst({
      where: {
        businessId: professional.business_id,
        personId: user.personId,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new BadRequestException(
        'Você precisa ser cliente deste negócio para criar recorrência.',
      );
    }

    return this.recurringAppointmentsService.createSeries({
      businessId: professional.business_id,
      businessCustomerId: customer.id,
      personId: user.personId,
      professionalProfileId: payload.professional_id,
      serviceId: payload.service_id,
      comboId: payload.combo_id,
      planSubscriptionId: payload.plan_subscription_id,
      firstAppointmentDate: payload.first_appointment_date,
      frequency: payload.frequency ?? 'WEEKLY',
      occurrences: Number(payload.occurrences),
      notes: payload.notes,
      createdByUserId: user.id,
      createdByUserType: 'CUSTOMER',
      origin: 'CLIENT_APP',
    });
  }
}
