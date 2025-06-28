import { PrismaService } from '@app/shared';
import { PAYMENT_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class CreateSetupIntentUseCase {
  constructor(
    private readonly rmqService: RmqService,
    private readonly prismaService: PrismaService,
  ) {}

  async execute(currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_slug)
      throw new UnauthorizedException(
        'Você não possui uma empresa selecionada',
      );

    const isTheUserOwner = await this.prismaService.business.findFirst({
      where: {
        slug: currentUser.current_selected_business_slug,
        ownerId: currentUser.id,
      },
      select: {
        id: true,
        stripe_customer_id: true,
      },
    });

    if (!isTheUserOwner)
      throw new UnauthorizedException(
        'Você não tem permissão para assinar este plano',
      );

    const business = isTheUserOwner;

    const setupIntent = await this.rmqService.requestFromQueue({
      routingKey: PAYMENT_QUEUES.USE_CASES.STRIPE_SETUP_INTENT_QUEUE,
      payload: {
        stripe_customer_id: business.stripe_customer_id,
        business_id: business.id,
      },
    });

    return setupIntent;
  }
}
