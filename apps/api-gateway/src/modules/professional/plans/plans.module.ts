import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { CreatePlanUseCase } from './use-cases/create-plan.use-case';

@Module({
  controllers: [PlansController],
  providers: [ResponseHandlerService, CreatePlanUseCase],
})
export class PlansModule {}
