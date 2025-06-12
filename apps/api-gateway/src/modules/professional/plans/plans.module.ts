import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { CreatePlanUseCase } from './use-cases/create-plan.use-case';
import { GetActivePlansUseCase } from './use-cases/get-active-plans.use-case';
import { SubscribeToPlanUseCase } from './use-cases/subscripe-to-plan.use-case';

@Module({
  controllers: [PlansController],
  providers: [
    ResponseHandlerService,
    CreatePlanUseCase,
    GetActivePlansUseCase,
    SubscribeToPlanUseCase,
  ],
})
export class PlansModule {}
