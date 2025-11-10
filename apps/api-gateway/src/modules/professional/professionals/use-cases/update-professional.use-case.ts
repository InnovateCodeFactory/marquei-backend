import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UpdateProfessionalDto } from '../dto/requests/update-professional.dto';

@Injectable()
export class UpdateProfessionalUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: UpdateProfessionalDto, user: CurrentUser) {
    if (!user.current_selected_business_id)
      throw new UnauthorizedException('Você não tem uma empresa selecionada');

    const { professionalProfileId, email, phone, name, servicesId } = payload;

    // Verify the professional exists and belongs to the current business
    const existingProfessional =
      await this.prismaService.professionalProfile.findFirst({
        where: {
          id: professionalProfileId,
          business_id: user.current_selected_business_id,
        },
        select: {
          id: true,
          phone: true,
          userId: true,
          User: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

    if (!existingProfessional)
      throw new NotFoundException(
        'Profissional não encontrado ou não pertence a esta empresa',
      );

    // Check if phone is being changed and if it's already in use by another professional
    if (phone && phone !== existingProfessional.phone) {
      const phoneInUse = await this.prismaService.professionalProfile.findFirst(
        {
          where: {
            business_id: user.current_selected_business_id,
            phone,
            id: {
              not: professionalProfileId,
            },
          },
          select: {
            id: true,
          },
        },
      );

      if (phoneInUse)
        throw new BadRequestException(
          'Já existe um profissional cadastrado com esse telefone para esta empresa',
        );
    }

    // Build update data object with only changed fields
    const professionalProfileUpdateData: any = {};
    const userUpdateData: any = {};

    // Check and add changed fields for professional profile
    if (phone && phone !== existingProfessional.phone) {
      professionalProfileUpdateData.phone = phone;
    }

    // Check and add changed fields for user
    if (
      name &&
      existingProfessional.User &&
      name !== existingProfessional.User.name
    ) {
      userUpdateData.name = name;
    }

    if (
      email &&
      existingProfessional.User &&
      email !== existingProfessional.User.email
    ) {
      userUpdateData.email = email;
    }

    // Only update if there are changes
    const hasProfileChanges = Object.keys(professionalProfileUpdateData).length > 0;
    const hasUserChanges = Object.keys(userUpdateData).length > 0;

    if (!hasProfileChanges && !hasUserChanges) {
      // No changes detected, return early
      return null;
    }

    // Prepare the update with nested user update if needed
    const updateData: any = {
      ...professionalProfileUpdateData,
    };

    if (hasUserChanges && existingProfessional.userId) {
      updateData.User = {
        update: userUpdateData,
      };
    }

    // Perform the update
    await this.prismaService.professionalProfile.update({
      where: {
        id: professionalProfileId,
      },
      data: updateData,
    });

    if (Array.isArray(servicesId)) {
      const unique = Array.from(new Set(servicesId.filter(Boolean)));

      if (unique.length) {
        const validCount = await this.prismaService.service.count({
          where: {
            id: { in: unique },
            business: { id: user.current_selected_business_id },
          },
        });
        if (validCount !== unique.length)
          throw new BadRequestException('Serviço inválido para este negócio');
      }

      const current = await this.prismaService.professionalService.findMany({
        where: { professional_profile_id: professionalProfileId },
        select: { service_id: true },
      });
      const currentIds = new Set(current.map((x) => x.service_id));
      const toAdd = unique.filter((id) => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter((id) => !unique.includes(id));

      if (toRemove.length) {
        await this.prismaService.professionalService.deleteMany({
          where: {
            professional_profile_id: professionalProfileId,
            service_id: { in: toRemove },
          },
        });
      }

      if (toAdd.length) {
        await this.prismaService.professionalService.createMany({
          data: toAdd.map((sid) => ({
            professional_profile_id: professionalProfileId,
            service_id: sid,
            active: true,
          })),
          skipDuplicates: true,
        });
      }
    }

    return null;
  }
}
