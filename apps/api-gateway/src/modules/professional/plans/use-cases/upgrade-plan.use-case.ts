import { PrismaService } from '@app/shared';
import { PAYMENT_QUEUES } from '@app/shared/modules/rmq/constants';
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
export class UpgradePlanUseCase {
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

    // Check if business has an active subscription
    const activeLocalSub =
      await this.prismaService.businessSubscription.findFirst({
        where: {
          businessId: business.id,
          status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
          plan: {
            name: { not: 'Teste Gratuito' },
          },
        },
        select: { id: true },
      });

    if (!activeLocalSub) {
      throw new UnauthorizedException(
        'Você não possui uma assinatura ativa para fazer upgrade',
      );
    }

    // Perform upgrade in Stripe (proration + reset cycle)
    const result: { updated?: boolean } | null =
      await this.rmqService.requestFromQueue({
        routingKey: PAYMENT_QUEUES.USE_CASES.UPGRADE_STRIPE_SUBSCRIPTION_QUEUE,
        payload: {
          price_id: payload.price_id,
          stripe_customer_id: business.stripe_customer_id,
          proration: 'create_prorations',
          reset_cycle_now: true,
        },
      });

    if (!result || result.updated === false)
      throw new InternalServerErrorException(
        'Erro ao atualizar assinatura. Tente novamente mais tarde.',
      );

    return { success: true };
  }
}
