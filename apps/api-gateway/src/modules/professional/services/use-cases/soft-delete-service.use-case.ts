import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SoftDeleteServiceDto } from '../dto/requests/soft-delete-service.dto';

@Injectable()
export class SoftDeleteServiceUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: SoftDeleteServiceDto, currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_slug)
      throw new BadRequestException('Nenhum negócio selecionado');

    const { current_selected_business_slug } = currentUser;
    const { serviceId } = payload;

    // 1. Verify the service exists and belongs to the current business
    const existingService = await this.prismaService.service.findFirst({
      where: {
        id: serviceId,
        business: {
          slug: current_selected_business_slug,
        },
      },
      select: {
        id: true,
        is_active: true,
      },
    });

    if (!existingService)
      throw new NotFoundException(
        'Serviço não encontrado ou não pertence a esta empresa',
      );

    // 2. Check if service has future appointments (PENDING or CONFIRMED)
    const now = new Date();
    const hasFutureAppointments =
      await this.prismaService.appointment.findFirst({
        where: {
          service_id: serviceId,
          start_at_utc: {
            gt: now,
          },
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
        },
        select: {
          id: true,
        },
      });

    if (hasFutureAppointments) {
      throw new BadRequestException(
        'Não é possível desativar este serviço pois ele possui agendamentos futuros pendentes ou confirmados',
      );
    }

    // 3. Soft delete by setting is_active to false
    await this.prismaService.service.update({
      where: {
        id: serviceId,
      },
      data: {
        is_active: false,
      },
    });

    return null;
  }
}
