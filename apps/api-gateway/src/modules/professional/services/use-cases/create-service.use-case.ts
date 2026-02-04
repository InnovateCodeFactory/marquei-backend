import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { hasProhibitedTerm } from '@app/shared/utils';
import { CreateServiceDto } from '../dto/requests/create-service.dto';

@Injectable()
export class CreateServiceUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: CreateServiceDto, currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_slug)
      throw new BadRequestException('Nenhum negócio selecionado');

    const { current_selected_business_slug } = currentUser;
    const trimValue = (value?: string | null) =>
      typeof value === 'string' ? value.trim() : value;
    const duration = payload.duration;
    const name = trimValue(payload.name);
    const price_in_cents = payload.price_in_cents;
    const color = trimValue(payload.color);
    const professionalsId = payload.professionalsId;

    if (name && hasProhibitedTerm(name, 'service')) {
      throw new BadRequestException(
        'Nome do serviço contém termos não permitidos',
      );
    }

    const serviceExists = await this.prismaService.service.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        business: {
          slug: current_selected_business_slug,
        },
      },
      select: {
        id: true,
      },
    });

    if (serviceExists)
      throw new ConflictException('Serviço já cadastrado com este nome');

    const selectedProfessionals = Array.isArray(professionalsId)
      ? Array.from(new Set(professionalsId.filter(Boolean)))
      : [];

    if (selectedProfessionals.length) {
      const count = await this.prismaService.professionalProfile.count({
        where: {
          id: { in: selectedProfessionals },
          business: { slug: current_selected_business_slug },
        },
      });
      if (count !== selectedProfessionals.length)
        throw new BadRequestException(
          'Profissional inválido para este negócio',
        );
    }

    await this.prismaService.service.create({
      data: {
        name,
        duration,
        price_in_cents,
        ...(color ? { color } : {}),
        professionals: {
          createMany: {
            data: selectedProfessionals.map((pid) => ({
              professional_profile_id: pid,
              active: true,
            })),
            skipDuplicates: true,
          },
        },
        business: {
          connect: {
            slug: current_selected_business_slug,
          },
        },
      },
    });

    return null;
  }
}
