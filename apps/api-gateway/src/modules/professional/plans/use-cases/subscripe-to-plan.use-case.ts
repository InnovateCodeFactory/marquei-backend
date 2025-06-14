import { PrismaService } from '@app/shared';
import { CREATE_STRIPE_SUBSCRIPTION_QUEUE } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SubscribeToPlanDto } from '../dto/requests/subscribe-to-plan.dto';

@Injectable()
export class SubscribeToPlanUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(payload: SubscribeToPlanDto, currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_slug)
      throw new UnauthorizedException(
        'Você não possui uma empresa selecionada',
      );

    const [planExists, isTheUserOwner] = await Promise.all([
      this.prismaService.plan.findUnique({
        where: {
          stripePriceId: payload.price_id,
          is_active: true,
        },
        select: {
          id: true,
        },
      }),
      this.prismaService.business.findFirst({
        where: {
          slug: currentUser.current_selected_business_slug,
          ownerId: currentUser.id,
        },
        select: {
          id: true,
          stripe_customer_id: true,
        },
      }),
    ]);

    if (!planExists) throw new NotFoundException('Plano não encontrado');
    if (!isTheUserOwner)
      throw new UnauthorizedException(
        'Você não tem permissão para assinar este plano',
      );

    const business = isTheUserOwner;

    const subscription: { client_secret: string } | null =
      await this.rmqService.requestFromQueue({
        routingKey: CREATE_STRIPE_SUBSCRIPTION_QUEUE,
        payload: {
          price_id: payload.price_id,
          stripe_customer_id: business.stripe_customer_id,
          business_id: business.id,
        },
      });

    if (!subscription)
      throw new InternalServerErrorException(
        'Erro ao criar assinatura. Tente novamente mais tarde.',
      );

    const { client_secret } = subscription;
    return {
      client_secret,
    };
  }
}
