import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateServiceDto } from '../dto/requests/update-service.dto';

@Injectable()
export class UpdateServiceUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: UpdateServiceDto, currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_slug)
      throw new BadRequestException('Nenhum negócio selecionado');

    const { current_selected_business_slug } = currentUser;
    const { serviceId, name, duration, price_in_cents } = payload;

    // Verify the service exists and belongs to the current business
    const existingService = await this.prismaService.service.findFirst({
      where: {
        id: serviceId,
        business: {
          slug: current_selected_business_slug,
        },
      },
      select: {
        id: true,
        name: true,
        duration: true,
        price_in_cents: true,
      },
    });

    if (!existingService)
      throw new NotFoundException(
        'Serviço não encontrado ou não pertence a esta empresa',
      );

    // Check if name is being changed and if it's already in use by another service
    if (name && name !== existingService.name) {
      const nameInUse = await this.prismaService.service.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive',
          },
          business: {
            slug: current_selected_business_slug,
          },
          id: {
            not: serviceId,
          },
        },
        select: {
          id: true,
        },
      });

      if (nameInUse)
        throw new ConflictException('Serviço já cadastrado com este nome');
    }

    // Build update data object with only changed fields
    const updateData: any = {};

    if (name && name !== existingService.name) {
      updateData.name = name;
    }

    if (duration && duration !== existingService.duration) {
      updateData.duration = duration;
    }

    if (price_in_cents && price_in_cents !== existingService.price_in_cents) {
      updateData.price_in_cents = price_in_cents;
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      // No changes detected, return early
      return null;
    }

    // Perform the update
    await this.prismaService.service.update({
      where: {
        id: serviceId,
      },
      data: updateData,
    });

    return null;
  }
}