import { PrismaService } from '@app/shared';
import { SendInAppNotificationDto } from '@app/shared/dto/messaging/in-app-notifications';
import { SendWelcomeMailDto } from '@app/shared/dto/messaging/mail-notifications';
import { DaysOfWeek, SendMailTypeEnum } from '@app/shared/enum';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { HashingService } from '@app/shared/services';
import { getFirstName } from '@app/shared/utils';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAccountDto } from '../dto/requests/create-account';

@Injectable()
export class CreateAccountUseCase {
  private readonly FREE_TRIAL_DAYS = 14;
  private readonly daysOfWeek = [
    DaysOfWeek.SUNDAY,
    DaysOfWeek.MONDAY,
    DaysOfWeek.TUESDAY,
    DaysOfWeek.WEDNESDAY,
    DaysOfWeek.THURSDAY,
    DaysOfWeek.FRIDAY,
    DaysOfWeek.SATURDAY,
  ];

  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(registerDto: CreateAccountDto) {
    const { name, email, password, documentNumber, phone, business } =
      registerDto;

    const slug = this.makeSlugFromName(business.name);

    const [existingUser, existingBusiness, mailValidation, freeTrialPlan] =
      await Promise.all([
        this.prismaService.user.findUnique({
          where: { uq_user_email_type: { email, user_type: 'PROFESSIONAL' } },
          select: { id: true },
        }),
        this.prismaService.business.findUnique({
          where: { slug },
          select: { id: true },
        }),
        this.prismaService.mailValidation.findFirst({
          where: {
            email,
            type: SendMailTypeEnum.VALIDATION_CODE,
            validated: true,
            active: false,
            created_at: {
              gte: new Date(Date.now() - 15 * 60 * 1000), // 15 minutos
            },
          },
          select: { id: true },
        }),
        this.prismaService.plan.findFirst({
          where: { plan_id: 'free_trial' },
          select: { id: true },
        }),
      ]);

    if (!mailValidation) throw new BadRequestException('Email não validado');
    if (existingUser) throw new BadRequestException('Email já está em uso');
    if (existingBusiness)
      throw new BadRequestException('Negócio já cadastrado com esse nome');
    if (!freeTrialPlan)
      throw new BadRequestException('Plano FREE_TRIAL não configurado');

    const openingHours = this.daysOfWeek.map((day, index) => {
      const dayData = business.openingHours[index];
      return {
        day,
        times: dayData.times,
        closed: dayData.closed,
      };
    });

    const now = new Date();
    const trialEnd = new Date(
      now.getTime() + this.FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000,
    );

    const newBusiness = await this.prismaService.business.create({
      data: {
        slug,
        name: business.name,
        latitude: business.latitude,
        longitude: business.longitude,
        opening_hours: JSON.stringify(openingHours),
        zipCode: business.zipCode,
        city: business.city,
        street: business.street,
        number: business.number,
        complement: business.complement,
        neighbourhood: business.neighbourhood,
        uf: business.uf,
        public_type: business.publicType as any,
        owner: {
          create: {
            email,
            name,
            password: await this.hashingService.hash(password),
            user_type: 'PROFESSIONAL',
            document_number: documentNumber,
          },
        },
        BusinessCategory: {
          connect: { id: business.category },
        },
        ...(business.business_category_custom && {
          business_category_custom: business.business_category_custom,
        }),
        BusinessServiceType: {
          connect: { id: business.placeType },
        },
        BusinessReminderSettings: {
          create: {
            is_active: true,
          },
        },
        BusinessSubscription: {
          create: {
            planId: freeTrialPlan.id,
            status: 'ACTIVE', // ou 'ACTIVE' se você preferir
            current_period_start: now,
            current_period_end: trialEnd,
            cancel_at_period_end: true,
            subscription_histories: {
              create: {
                action: 'CREATED',
                previousPlanId: null,
                newPlanId: freeTrialPlan.id,
                reason: 'Free trial automático na criação do negócio',
              },
            },
          },
        },
      },
      select: {
        id: true,
        owner: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!newBusiness) {
      throw new BadRequestException('Failed to create business');
    }

    const professionalProfile =
      await this.prismaService.professionalProfile.create({
        data: {
          business: {
            connect: { id: newBusiness.id },
          },
          User: {
            connect: { id: newBusiness.owner.id },
          },
          phone,
        },
        select: {
          id: true,
        },
      });

    await Promise.all([
      this.rmqService.publishToQueue({
        routingKey:
          MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
        payload: new SendInAppNotificationDto({
          title: 'Bem-vindo(a) ao Marquei!',
          body: `Olá ${getFirstName(name)}, seja bem-vindo(a) ao Marquei! Estamos felizes em tê-lo(a) conosco!`,
          professionalProfileId: professionalProfile.id,
        }),
      }),
      // this.rmqService.publishToQueue({
      //   routingKey: PAYMENT_QUEUES.USE_CASES.CREATE_STRIPE_CUSTOMER_QUEUE,
      //   payload: {
      //     businessId: newBusiness.id,
      //   },
      // }),
      this.prismaService.currentSelectedBusiness.create({
        data: {
          business: { connect: { id: newBusiness.id } },
          user: { connect: { id: newBusiness.owner.id } },
        },
      }),
      this.rmqService.publishToQueue({
        payload: new SendWelcomeMailDto({
          to: email,
          firstName: getFirstName(name),
        }),
        routingKey:
          MESSAGING_QUEUES.MAIL_NOTIFICATIONS
            .SEND_WELCOME_PROFESSIONAL_MAIL_QUEUE,
      }),
    ]);

    return null;
  }

  private makeSlugFromName(name: string): string {
    return name
      .normalize('NFD') // separa letras de acentos
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // troca não alfanumérico por hífen
      .replace(/^-|-$/g, ''); // remove hífen no começo/fim
  }
}
