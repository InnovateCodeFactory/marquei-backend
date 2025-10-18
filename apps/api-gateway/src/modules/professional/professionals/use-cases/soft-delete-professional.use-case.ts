import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SoftDeleteProfessionalDto } from '../dto/requests/soft-delete-professional.dto';

@Injectable()
export class SoftDeleteProfessionalUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(
    payload: SoftDeleteProfessionalDto,
    currentUser: CurrentUser,
  ) {
    if (!currentUser.current_selected_business_id)
      throw new UnauthorizedException('Você não tem uma empresa selecionada');

    const { professionalProfileId } = payload;

    // 1. Verify the professional exists and belongs to the current business
    const existingProfessional =
      await this.prismaService.professionalProfile.findFirst({
        where: {
          id: professionalProfileId,
          business_id: currentUser.current_selected_business_id,
        },
        select: {
          id: true,
          status: true,
          userId: true,
          business: {
            select: {
              ownerId: true,
            },
          },
        },
      });

    if (!existingProfessional)
      throw new NotFoundException(
        'Profissional não encontrado ou não pertence a esta empresa',
      );

    // 2. Prevent self-deletion
    if (existingProfessional.userId === currentUser.id) {
      throw new ForbiddenException('Você não pode desativar seu próprio perfil');
    }

    // 3. Prevent deleting the business owner
    if (existingProfessional.userId === existingProfessional.business.ownerId) {
      throw new ForbiddenException(
        'Não é possível desativar o perfil do proprietário do negócio',
      );
    }

    // 4. Check if professional has future appointments (PENDING or CONFIRMED)
    const now = new Date();
    const hasFutureAppointments =
      await this.prismaService.appointment.findFirst({
        where: {
          professionalProfileId,
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
        'Não é possível desativar este profissional pois ele possui agendamentos futuros pendentes ou confirmados',
      );
    }

    // 5. Soft delete by updating status to INACTIVE
    await this.prismaService.professionalProfile.update({
      where: {
        id: professionalProfileId,
      },
      data: {
        status: 'INACTIVE',
      },
    });

    return null;
  }
}
