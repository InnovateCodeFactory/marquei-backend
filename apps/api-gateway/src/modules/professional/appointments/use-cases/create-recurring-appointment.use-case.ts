import { PrismaService } from '@app/shared';
import { RecurringAppointmentsService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateRecurringAppointmentDto } from '../dto/requests/create-recurring-appointment.dto';

@Injectable()
export class CreateRecurringAppointmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recurringAppointmentsService: RecurringAppointmentsService,
  ) {}

  async execute(payload: CreateRecurringAppointmentDto, req: AppRequest) {
    const { user } = req;

    if (!user?.current_selected_business_id) {
      throw new UnauthorizedException('User not authorized');
    }

    if (user.user_type !== 'PROFESSIONAL') {
      throw new UnauthorizedException('User not authorized');
    }

    if (!payload.customer_id) {
      throw new BadRequestException('Cliente obrigatório para recorrência.');
    }

    const customer = await this.prisma.businessCustomer.findFirst({
      where: {
        id: payload.customer_id,
        businessId: user.current_selected_business_id,
      },
      select: { personId: true },
    });

    if (!customer) {
      throw new BadRequestException(
        'O cliente informado não pertence ao negócio selecionado.',
      );
    }

    return this.recurringAppointmentsService.createSeries({
      businessId: user.current_selected_business_id,
      businessCustomerId: payload.customer_id,
      personId: customer.personId,
      professionalProfileId: payload.professional_id,
      serviceId: payload.service_id,
      comboId: payload.combo_id,
      planSubscriptionId: payload.plan_subscription_id,
      firstAppointmentDate: payload.first_appointment_date,
      frequency: payload.frequency ?? 'WEEKLY',
      occurrences: Number(payload.occurrences),
      notes: payload.notes,
      createdByUserId: user.id,
      createdByUserType: 'PROFESSIONAL',
      origin: 'PROFESSIONAL_APP',
    });
  }
}
