import { PrismaService } from '@app/shared';
import { WelcomeMessageDto } from '@app/shared/dto/messaging/in-app-notifications';
import { DaysOfWeek } from '@app/shared/enum';
import {
  MESSAGING_QUEUES,
  PAYMENT_QUEUES,
} from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { HashingService } from '@app/shared/services';
import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisterProfessionalUserDto } from '../dto/requests/register-professional-user';

@Injectable()
export class RegisterProfessionalUserUseCase {
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
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly rmq: RmqService,
  ) {}

  async execute(registerDto: RegisterProfessionalUserDto) {
    const { name, email, password, documentNumber, phone, business } =
      registerDto;

    const slug = this.makeSlugFromName(business.name);

    const [existingAccount, existingBusiness] = await Promise.all([
      this.prisma.authAccount.findUnique({
        where: { email },
        select: { id: true },
      }),
      this.prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      }),
    ]);

    if (existingAccount) throw new BadRequestException('Email já está em uso');
    if (existingBusiness)
      throw new BadRequestException('Negócio já cadastrado com esse nome');

    // opening_hours como JSON estruturado (compatível com seu front)
    const openingHours = this.daysOfWeek.map((day, index) => {
      const dayData = business.openingHours[index];
      return {
        day,
        times: dayData.times,
        closed: dayData.closed,
      };
    });

    const passwordHash = await this.hashing.hash(password);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Conta autenticável
      const account = await tx.authAccount.create({
        data: {
          email,
          password_hash: passwordHash,
          first_access: false,
          is_active: true,
        },
        select: { id: true, email: true },
      });

      // 2) Pessoa (perfil base)
      const person = await tx.person.create({
        data: {
          name,
          email,
          phone,
          document: documentNumber ?? null,
        },
        select: { id: true },
      });

      // 3) Vínculo Person ↔ AuthAccount
      await tx.personAccount.create({
        data: {
          personId: person.id,
          authAccountId: account.id,
        },
      });

      // 4) Negócio (owner = AuthAccount)
      const newBusiness = await tx.business.create({
        data: {
          slug,
          name: business.name,
          latitude: business.latitude,
          longitude: business.longitude,
          zipCode: business.zipCode,
          street: business.street,
          neighbourhood: business.neighbourhood,
          number: business.number,
          complement: business.complement,
          city: business.city,
          uf: business.uf,
          opening_hours: JSON.stringify(openingHours),
          owner: { connect: { id: account.id } },
          ...(business.category && {
            BusinessCategory: { connect: { id: business.category } },
          }),
          ...(business.placeType && {
            BusinessServiceType: { connect: { id: business.placeType } },
          }),
        },
        select: { id: true, ownerId: true },
      });

      // 5) Perfil de Profissional (aponta para Person + Business)
      const professional = await tx.professionalProfile.create({
        data: {
          personId: person.id,
          business_id: newBusiness.id,
          phone,
        },
        select: { id: true },
      });

      return {
        businessId: newBusiness.id,
        ownerId: newBusiness.ownerId,
        professionalProfileId: professional.id,
        professionalName: name,
      };
    });

    // Mensageria externa
    await Promise.all([
      this.rmq.publishToQueue({
        routingKey: MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.WELCOME_QUEUE,
        payload: new WelcomeMessageDto({
          professionalName: result.professionalName,
          professionalProfileId: result.professionalProfileId,
        }),
      }),
      this.rmq.publishToQueue({
        routingKey: PAYMENT_QUEUES.USE_CASES.CREATE_STRIPE_CUSTOMER_QUEUE,
        payload: {
          businessId: result.businessId,
        },
      }),
    ]);

    return null;
  }

  private makeSlugFromName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
