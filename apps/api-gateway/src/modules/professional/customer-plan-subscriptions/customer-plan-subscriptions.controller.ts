import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  CreateCustomerPlanSubscriptionDto,
  ListCustomerPlanSubscriptionsDto,
} from './dto/requests/customer-plan-subscription.dto';
import {
  CreateCustomerPlanSubscriptionUseCase,
  ListCustomerPlanSubscriptionsUseCase,
  RenewCustomerPlanSubscriptionUseCase,
  UpdateCustomerPlanSubscriptionStatusUseCase,
} from './use-cases/customer-plan-subscriptions.use-cases';

@Controller('professional/customer-plan-subscriptions')
@ApiTags('Professional - Customer Plan Subscriptions')
export class CustomerPlanSubscriptionsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly createUseCase: CreateCustomerPlanSubscriptionUseCase,
    private readonly listUseCase: ListCustomerPlanSubscriptionsUseCase,
    private readonly renewUseCase: RenewCustomerPlanSubscriptionUseCase,
    private readonly statusUseCase: UpdateCustomerPlanSubscriptionStatusUseCase,
  ) {}

  @Post()
  async create(
    @Res() res: Response,
    @Body() body: CreateCustomerPlanSubscriptionDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.createUseCase.execute(body, user),
      res,
      successStatus: 201,
    });
  }

  @Get()
  async list(
    @Res() res: Response,
    @Query() query: ListCustomerPlanSubscriptionsDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.listUseCase.execute(query, user),
      res,
    });
  }

  @Post(':id/renew')
  async renew(
    @Res() res: Response,
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.renewUseCase.execute(id, user),
      res,
    });
  }

  @Post(':id/pause')
  async pause(
    @Res() res: Response,
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.statusUseCase.execute(id, 'PAUSED', user),
      res,
    });
  }

  @Post(':id/resume')
  async resume(
    @Res() res: Response,
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.statusUseCase.execute(id, 'ACTIVE', user),
      res,
    });
  }

  @Post(':id/cancel')
  async cancel(
    @Res() res: Response,
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.statusUseCase.execute(id, 'CANCELED', user),
      res,
    });
  }
}
