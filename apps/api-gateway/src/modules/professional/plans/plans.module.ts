import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { CheckActiveSubscriptionUseCase } from './use-cases/check-active-subscription.use-case';
import { GetActivePlansUseCase } from './use-cases/get-active-plans.use-case';
import { CreateSetupIntentUseCase } from './use-cases/setup-intent.use-case';
import { SubscribeToPlanUseCase } from './use-cases/subscribe-to-plan.use-case';
import { UpgradePlanUseCase } from './use-cases/upgrade-plan.use-case';

@Module({
  controllers: [PlansController],
  providers: [
    ResponseHandlerService,
    GetActivePlansUseCase,
    SubscribeToPlanUseCase,
    CreateSetupIntentUseCase,
    CheckActiveSubscriptionUseCase,
    UpgradePlanUseCase,
  ],
})
export class PlansModule {}
