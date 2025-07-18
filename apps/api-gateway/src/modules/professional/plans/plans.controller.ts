import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SubscribeToPlanDto } from './dto/requests/subscribe-to-plan.dto';
import { GetActivePlansUseCase } from './use-cases/get-active-plans.use-case';
import { CreateSetupIntentUseCase } from './use-cases/setup-intent.use-case';
import { SubscribeToPlanUseCase } from './use-cases/subscripe-to-plan.use-case';

@Controller('professional/plans')
@ApiTags('Plans')
export class PlansController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getActivePlansUseCase: GetActivePlansUseCase,
    private readonly subscribeToPlanUseCase: SubscribeToPlanUseCase,
    private readonly createSetupIntentUseCase: CreateSetupIntentUseCase,
  ) {}

  @Get('get-active-plans')
  @ApiOperation({
    summary: 'Get Active Plans',
  })
  async getActivePlans(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getActivePlansUseCase.execute(currentUser),
      res,
    });
  }

  @Post('subscribe-to-plan')
  @ApiOperation({
    summary: 'Subscribe to Plan',
  })
  async subscribeToPlan(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Res() res: Response,
    @Body() payload: SubscribeToPlanDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.subscribeToPlanUseCase.execute(payload, currentUser),
      res,
    });
  }

  @Get('setup-intent')
  @ApiOperation({
    summary: 'Setup Intent',
  })
  async setupIntent(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.createSetupIntentUseCase.execute(currentUser),
      res,
    });
  }
}
