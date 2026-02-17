import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetProfessionalsForAppointmentDto } from '../dto/requests/get-professionals.dto';

@Injectable()
export class GetProfessionalsForAppointmentUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(query: GetProfessionalsForAppointmentDto) {
    const hasServiceId = Boolean(query.service_id?.trim());
    const hasComboId = Boolean(query.combo_id?.trim());

    if (!hasServiceId && !hasComboId) {
      throw new BadRequestException(
        'Informe service_id ou combo_id para buscar profissionais',
      );
    }

    if (hasServiceId && hasComboId) {
      throw new BadRequestException(
        'Informe apenas um entre service_id ou combo_id',
      );
    }

    if (hasComboId) {
      const combo = await this.prismaService.serviceCombo.findFirst({
        where: {
          id: query.combo_id!,
          is_active: true,
          deleted_at: null,
          business: { slug: query.slug },
        },
        select: {
          id: true,
          items: {
            where: {
              service: {
                is_active: true,
              },
            },
            select: { id: true },
          },
        },
      });

      if (!combo) {
        throw new NotFoundException('Combo não encontrado para este negócio');
      }

      if ((combo.items?.length ?? 0) < 2) {
        throw new BadRequestException('Combo indisponível para agendamento');
      }
    }

    const offeringFilter = hasServiceId
      ? {
          services: {
            some: {
              service_id: query.service_id!,
              active: true,
            },
          },
        }
      : {
          serviceCombos: {
            some: {
              service_combo_id: query.combo_id!,
              active: true,
            },
          },
        };

    const professionals = await this.prismaService.professionalProfile.findMany({
      where: {
        business: {
          slug: query.slug,
        },
        status: 'ACTIVE',
        ...offeringFilter,
      },
      select: {
        id: true,
        User: {
          select: {
            name: true,
          },
        },
        profile_image: true,
      },
    });

    return professionals?.map((professional) => ({
      id: professional.id,
      name: professional.User?.name?.split(' ')[0] || '',
      profile_image: this.fs.getPublicUrl({
        key: professional.profile_image,
      }),
    }));
  }
}
