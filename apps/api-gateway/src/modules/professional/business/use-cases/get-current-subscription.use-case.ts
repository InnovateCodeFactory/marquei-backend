import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Price } from '@app/shared/value-objects';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class GetCurrentSubscriptionUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_id)
      throw new BadRequestException('No business selected');

    const currentPlan = await this.prismaService.businessSubscription.findFirst(
      {
        where: {
          businessId: currentUser.current_selected_business_id,
        },
        select: {
          current_period_end: true,
          status: true,
          plan: {
            select: {
              billing_period: true,
              name: true,
              price_in_cents: true,
            },
          },
        },
      },
    );

    if (!currentPlan)
      throw new NotFoundException(
        'No current subscription found for the selected business',
      );

    return {
      next_billing_date_timestamp:
        new Date(currentPlan.current_period_end).getTime() / 1000,
      status: currentPlan.status,
      plan: {
        billing_period: currentPlan.plan.billing_period,
        name: currentPlan.plan.name,
        price: `${new Price(currentPlan.plan.price_in_cents).toCurrency()}/Mês`,
        is_free_trial: currentPlan.plan.billing_period === 'FREE_TRIAL',
      },
    };
  }
}
