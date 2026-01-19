import { PrismaService } from '@app/shared';
import { systemGeneralSettings } from '@app/shared/config/system-general-settings';
import { SendInAppNotificationDto } from '@app/shared/dto/messaging/in-app-notifications';
import { SendWhatsAppTextMessageDto } from '@app/shared/dto/messaging/whatsapp-notifications';
import { BuildNewProfessionalMessage } from '@app/shared/messsage-builders';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { HashingService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { generateRandomString, getFirstName } from '@app/shared/utils';
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
  private readonly maxProfessionalsForFeaturedBusiness = 999;
  private readonly logger = new Logger(CreateProfessionalUseCase.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(payload: CreateProfessionalDto, user: CurrentUser) {
    if (!user.current_selected_business_id)
      throw new UnauthorizedException('Você não tem uma empresa selecionada');

    const iosStoreLink = systemGeneralSettings.marquei_pro_app_store_url ?? '';
    const androidStoreLink =
      systemGeneralSettings.marquei_pro_play_store_url ?? '';

    const activeSub = await this.prismaService.businessSubscription.findFirst({
      where: {
        businessId: user.current_selected_business_id,
        status: 'ACTIVE',
      },
      select: {
        plan: {
          select: {
            max_professionals_allowed: true,
          },
        },
        business: {
          select: {
            is_featured: true,
          },
        },
      },
    });

    const profLimitBenefit = activeSub?.business?.is_featured
      ? this.maxProfessionalsForFeaturedBusiness
      : activeSub?.plan.max_professionals_allowed;

    const limit = profLimitBenefit;

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

    // Verifica se já existe um usuário PROFESSIONAL com o email informado
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        uq_user_email_type: {
          email: payload.email,
          user_type: 'PROFESSIONAL',
        },
      },
      select: { id: true, name: true },
    });

    let createdProfessionalId: string | null = null;

    if (!existingUser) {
      // Fluxo atual (novo usuário): cria usuário com senha temporária e first_access
      const temporary_password = generateRandomString(8);

      const professional = await this.prismaService.professionalProfile.create({
        data: {
          phone: payload.phone,
          status: 'PENDING_VERIFICATION',
          business: {
            connect: { id: user.current_selected_business_id },
          },
          User: {
            connectOrCreate: {
              where: {
                uq_user_email_type: {
                  email: payload.email,
                  user_type: 'PROFESSIONAL',
                },
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
          business: { select: { name: true } },
        },
      });

      createdProfessionalId = professional.id;

      await Promise.all([
        this.rmqService.publishToQueue({
          routingKey:
            MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
          payload: new SendInAppNotificationDto({
            title: 'Bem-vindo(a) ao Marquei!',
            body: `Olá ${getFirstName(payload.name)}, seja bem-vindo(a) ao Marquei! Estamos felizes em tê-lo(a) conosco!`,
            professionalProfileId: professional.id,
          }),
        }),

        this.rmqService.publishToQueue({
          routingKey:
            MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS.SEND_TEXT_MESSAGE_QUEUE,
          payload: new SendWhatsAppTextMessageDto({
            phone_number: payload.phone,
            message: BuildNewProfessionalMessage.forWhatsapp({
              name: getFirstName(payload.name),
              business_name: professional.business.name,
              username: payload.email,
              password: temporary_password,
              ios_link: iosStoreLink,
              android_link: androidStoreLink,
            }),
          }),
        }),
      ]);
    } else {
      // Usuário já existe (em outra empresa): cria apenas novo perfil profissional vinculado ao user existente
      const professional = await this.prismaService.professionalProfile.create({
        data: {
          phone: payload.phone,
          status: 'ACTIVE',
          business: {
            connect: { id: user.current_selected_business_id },
          },
          User: {
            connect: { id: existingUser.id },
          },
        },
        select: {
          id: true,
          business: { select: { name: true } },
        },
      });

      createdProfessionalId = professional.id;

      await Promise.all([
        this.rmqService.publishToQueue({
          routingKey:
            MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
          payload: new SendInAppNotificationDto({
            title: 'Bem-vindo(a) ao Marquei!',
            body: `Olá ${getFirstName(payload.name)}, seja bem-vindo(a) ao Marquei! Estamos felizes em tê-lo(a) conosco!`,
            professionalProfileId: professional.id,
          }),
        }),

        this.rmqService.publishToQueue({
          routingKey:
            MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS.SEND_TEXT_MESSAGE_QUEUE,
          payload: new SendWhatsAppTextMessageDto({
            phone_number: payload.phone,
            message: BuildNewProfessionalMessage.welcomeOnlyWhatsapp({
              name: getFirstName(payload.name),
              business_name: professional.business.name,
              ios_link: iosStoreLink,
              android_link: androidStoreLink,
            }),
          }),
        }),
      ]);
    }

    // vincula serviços (se enviados)
    if (
      createdProfessionalId &&
      Array.isArray(payload.servicesId) &&
      payload.servicesId.length
    ) {
      // valida que serviços pertencem ao negócio atual
      const unique = Array.from(new Set(payload.servicesId.filter(Boolean)));
      const validCount = await this.prismaService.service.count({
        where: {
          id: { in: unique },
          business: { id: user.current_selected_business_id },
        },
      });
      if (validCount !== unique.length)
        throw new BadRequestException('Serviços inválidos para este negócio');

      await this.prismaService.professionalService.createMany({
        data: unique.map((sid) => ({
          professional_profile_id: createdProfessionalId!,
          service_id: sid,
          active: true,
        })),
        skipDuplicates: true,
      });
    }

    return null;
  }
}
