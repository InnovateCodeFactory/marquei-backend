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
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly rmq: RmqService,
  ) {}

  async execute(payload: CreateProfessionalDto, user: CurrentUser) {
    if (!user.current_selected_business_id) {
      throw new UnauthorizedException('Você não tem uma empresa selecionada');
    }

    // 1) Limite do plano
    const activeSub = await this.prisma.businessSubscription.findFirst({
      where: {
        businessId: user.current_selected_business_id,
        status: 'ACTIVE',
      },
      select: {
        plan: {
          select: {
            PlanBenefit: {
              where: { key: 'PROFESSIONALS' },
              select: { intValue: true },
            },
          },
        },
      },
    });

    const limit = activeSub?.plan.PlanBenefit[0]?.intValue ?? 0;
    const currentCount = await this.prisma.professionalProfile.count({
      where: { business_id: user.current_selected_business_id },
    });

    if (currentCount >= limit) {
      throw new ForbiddenException(
        'Limite de profissionais do plano atingido.',
      );
    }

    // 2) Duplicidade por telefone no negócio
    const exists = await this.prisma.professionalProfile.findFirst({
      where: {
        business_id: user.current_selected_business_id,
        phone: payload.phone,
      },
      select: { id: true },
    });
    if (exists) {
      throw new BadRequestException(
        'Já existe um profissional cadastrado com esse telefone para esta empresa',
      );
    }

    const temporaryPassword = generateRandomString(8);
    const passwordHash = await this.hashing.hash(temporaryPassword);

    // 3) Criação transacional: AuthAccount + Person + PersonAccount + ProfessionalProfile
    const { professionalId } = await this.prisma.$transaction(async (tx) => {
      // 3.1) AuthAccount (upsert por email)
      // Se já existir, manteremos; se não, criar com senha temporária e firstAccess=true
      const account = await tx.authAccount.upsert({
        where: { email: payload.email },
        update: {}, // não altere hash aqui para não sobrescrever senhas de contas existentes
        create: {
          email: payload.email,
          password_hash: passwordHash,
          temporary_password: temporaryPassword,
          first_access: false,
          is_active: true,
        },
        select: { id: true, email: true },
      });

      // 3.2) Person (se email é único, podemos tentar achar por ele; senão criamos nova)
      let person = await tx.person.findUnique({
        where: { email: payload.email },
        select: { id: true },
      });

      if (!person) {
        person = await tx.person.create({
          data: {
            name: payload.name,
            phone: payload.phone,
            email: payload.email,
          },
          select: { id: true },
        });
      }

      // 3.3) Garantir PersonAccount 1:1
      const existingByAccount = await tx.personAccount.findUnique({
        where: { authAccountId: account.id },
        select: { id: true, personId: true },
      });

      if (existingByAccount && existingByAccount.personId !== person.id) {
        // conta já vinculada a outra pessoa → conflito
        throw new BadRequestException(
          'A conta já está vinculada a outra pessoa.',
        );
      }

      const existingByPerson = await tx.personAccount.findUnique({
        where: { personId: person.id },
        select: { id: true, authAccountId: true },
      });

      if (!existingByAccount && !existingByPerson) {
        await tx.personAccount.create({
          data: {
            personId: person.id,
            authAccountId: account.id,
          },
        });
      } else if (
        existingByPerson &&
        existingByPerson.authAccountId !== account.id
      ) {
        throw new BadRequestException(
          'Esta pessoa já está vinculada a outra conta.',
        );
      }

      // 3.4) ProfessionalProfile
      const professional = await tx.professionalProfile.create({
        data: {
          phone: payload.phone,
          status: 'PENDING_VERIFICATION',
          business: { connect: { id: user.current_selected_business_id } },
          person: { connect: { id: person.id } },
        },
        select: { id: true },
      });

      return { professionalId: professional.id };
    });

    // 4) Mensageria (boas-vindas).
    // (Se quiser, adicione envio de e-mail/whatsapp com temporaryPassword.)
    await this.rmq.publishToQueue({
      routingKey: MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.WELCOME_QUEUE,
      payload: new WelcomeMessageDto({
        professionalName: payload.name,
        professionalProfileId: professionalId,
      }),
    });

    return null;
  }
}
