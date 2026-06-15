import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  CreateCustomerServicePlanDto,
  UpdateCustomerServicePlanDto,
} from './dto/requests/customer-service-plan.dto';
import {
  CreateCustomerServicePlanUseCase,
  ListCustomerServicePlansUseCase,
  UpdateCustomerServicePlanUseCase,
} from './use-cases/customer-service-plans.use-cases';

@Controller('professional/customer-service-plans')
@ApiTags('Professional - Customer Service Plans')
export class CustomerServicePlansController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly createPlanUseCase: CreateCustomerServicePlanUseCase,
    private readonly listPlansUseCase: ListCustomerServicePlansUseCase,
    private readonly updatePlanUseCase: UpdateCustomerServicePlanUseCase,
  ) {}

  @Post()
  async create(
    @Res() res: Response,
    @Body() body: CreateCustomerServicePlanDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.createPlanUseCase.execute(body, user),
      res,
      successStatus: 201,
    });
  }

  @Get()
  async list(@Res() res: Response, @CurrentUserDecorator() user: CurrentUser) {
    return this.responseHandler.handle({
      method: () => this.listPlansUseCase.execute(user),
      res,
    });
  }

  @Patch(':id')
  async update(
    @Res() res: Response,
    @Param('id') id: string,
    @Body() body: UpdateCustomerServicePlanDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.updatePlanUseCase.execute(id, body, user),
      res,
    });
  }
}
