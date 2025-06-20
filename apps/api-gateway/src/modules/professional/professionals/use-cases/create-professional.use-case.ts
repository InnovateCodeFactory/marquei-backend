import { PrismaService } from '@app/shared';
import { HashingService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { generateRandomString } from '@app/shared/utils';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateProfessionalDto } from '../dto/requests/create-professional.dto';

@Injectable()
export class CreateProfessionalUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
  ) {}

  async execute(payload: CreateProfessionalDto, user: CurrentUser) {
    if (!user.current_selected_business_id)
      throw new UnauthorizedException('Você não tem uma empresa selecionada');

    const userAlreadyExists =
      await this.prismaService.professionalProfile.findFirst({
        where: {
          business_id: user.current_selected_business_id,
          phone: payload.phone,
        },
        select: {
          id: true,
        },
      });

    if (userAlreadyExists)
      throw new BadRequestException(
        'Já existe um profissional cadastrado com esse telefone para esta empresa',
      );

    const temporary_password = generateRandomString(8);

    await this.prismaService.professionalProfile.create({
      data: {
        phone: payload.phone,
        status: 'PENDING_VERIFICATION',
        business: {
          connect: {
            id: user.current_selected_business_id,
          },
        },
        User: {
          connectOrCreate: {
            where: {
              email: payload.email,
            },
            create: {
              email: payload.email,
              name: payload.name,
              temporary_password,
              password: await this.hashingService.hash(temporary_password),
              user_type: 'PROFESSIONAL',
            },
          },
        },
      },
    });

    // Enviar mensagem no whatsapp ao profissional com a senha temporária
    // Criar notificação para o profissional in_app de boas-vindas
    // Enviar email ao profissional com a senha temporária

    return null;
  }
}
