import { PrismaService } from '@app/shared';
import { WelcomeMessageDto } from '@app/shared/dto/messaging/in-app-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { HashingService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { generateRandomString } from '@app/shared/utils';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateProfessionalDto } from '../dto/requests/create-professional.dto';

@Injectable()
export class CreateProfessionalUseCase {
  private readonly logger = new Logger(CreateProfessionalUseCase.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(payload: CreateProfessionalDto, user: CurrentUser) {
    if (!user.current_selected_business_id)
      throw new UnauthorizedException('Você não tem uma empresa selecionada');

    const activeSub = await this.prismaService.businessSubscription.findFirst({
      where: {
        businessId: user.current_selected_business_id,
        status: 'ACTIVE',
      },
      select: {
        plan: {
          select: {
            PlanBenefit: {
              where: {
                key: 'PROFESSIONALS',
              },
              select: {
                intValue: true,
              },
            },
          },
        },
      },
    });

    const profLimitBenefit = activeSub?.plan.PlanBenefit[0];

    const limit = profLimitBenefit?.intValue;

    const currentCount = await this.prismaService.professionalProfile.count({
      where: { business_id: user.current_selected_business_id },
    });

    if (currentCount >= limit) {
      throw new ForbiddenException(
        'Limite de profissionais do plano atingido.',
      );
    }

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

    const professional = await this.prismaService.professionalProfile.create({
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
              first_access: true,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    // Enviar mensagem no whatsapp ao profissional com a senha temporária
    // Criar notificação para o profissional in_app de boas-vindas
    // Enviar email ao profissional com a senha temporária
    await Promise.all([
      this.rmqService.publishToQueue({
        routingKey: MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.WELCOME_QUEUE,
        payload: new WelcomeMessageDto({
          professionalName: payload.name,
          professionalProfileId: professional.id,
        }),
      }),
    ]);

    return null;
  }
}
