import { PrismaService } from '@app/shared';
import { SendWelcomeMailDto } from '@app/shared/dto/messaging/mail-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { HashingService, TokenService } from '@app/shared/services';
import { getFirstName } from '@app/shared/utils';
import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserCustomerDto } from '../dto/requests/create-customer.dto';

@Injectable()
export class CreateCustomerUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
    private readonly rmqService: RmqService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(dto: CreateUserCustomerDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();

    // regra de negócio: um mesmo email não pode existir para user_type=CUSTOMER
    const existingUserByEmail = await this.prisma.user.findFirst({
      where: { email, user_type: 'CUSTOMER' },
      select: { id: true },
    });
    if (existingUserByEmail) {
      throw new ConflictException('E-mail já em uso para conta de cliente');
    }

    const passwordHash = await this.hashingService.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      // 1) Acha/Cria a Person (prioridade: email > phone; ajuste se tiver documento)
      const existingPersonByEmail = await tx.person.findUnique({
        where: { email },
        select: { id: true },
      });
      const existingPersonByPhone =
        !existingPersonByEmail && phone
          ? await tx.person.findUnique({
              where: { phone },
              select: { id: true },
            })
          : null;

      const personId =
        existingPersonByEmail?.id ||
        existingPersonByPhone?.id ||
        (
          await tx.person.create({
            data: {
              name: dto.name.trim(),
              email,
              phone,
            },
            select: { id: true },
          })
        ).id;

      // 2) Verifica se já existe um User ligado a essa Person (por causa de @unique em personId)
      const userWithSamePerson = await tx.user.findFirst({
        where: { personId },
        select: { id: true, user_type: true },
      });
      if (userWithSamePerson) {
        // se você quiser permitir “mesma pessoa com outro tipo de user”, tire o @unique do personId
        throw new ConflictException(
          'Já existe um usuário vinculado a esta pessoa',
        );
      }

      // 3) Cria o User CUSTOMER
      const user = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email,
          password: passwordHash,
          user_type: 'CUSTOMER',
          person: { connect: { id: personId } },
        },
        select: {
          id: true,
          personId: true,
          name: true,
          person: { select: { phone: true, profile_image: true } },
        },
      });

      // 4) Vincula Guest pelo device_token (se existir)
      const guest = await tx.guest.findUnique({
        where: { device_token: dto.device_token },
        select: { id: true, userId: true },
      });

      if (guest) {
        // se já estava vinculado a outro user, você decide se bloqueia ou substitui:
        if (guest.userId && guest.userId !== user.id) {
          // Ex.: trocar vínculo para o novo usuário
          await tx.guest.update({
            where: { device_token: dto.device_token },
            data: { user: { connect: { id: user.id } } },
          });
        } else if (!guest.userId) {
          await tx.guest.update({
            where: { device_token: dto.device_token },
            data: { user: { connect: { id: user.id } } },
          });
        }
      }

      // 5) Dispara email de boas-vindas
      await this.rmqService.publishToQueue({
        payload: new SendWelcomeMailDto({
          to: email,
          firstName: getFirstName(dto.name),
        }),
        routingKey:
          MESSAGING_QUEUES.MAIL_NOTIFICATIONS.SEND_WELCOME_CUSTOMER_MAIL_QUEUE,
      });

      const { accessToken, refreshToken } =
        await this.tokenService.issueTokenPair({
          id: user.id,
          user_type: 'CUSTOMER',
        });

      return {
        token: accessToken,
        refresh_token: refreshToken,
        user: {
          name: user.name,
          phone: user.person.phone,
          personId: user.personId,
          id: user.id,
          has_push_token: false,
          avatar_url: user.person.profile_image,
        },
      };
    });
  }
}
