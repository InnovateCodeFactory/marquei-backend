import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetCustomerPlansUseCase } from './use-cases/get-customer-plans.use-case';

@Controller('client/customer-plans')
@ApiTags('Clients - Customer Plans')
export class CustomerPlansController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getCustomerPlansUseCase: GetCustomerPlansUseCase,
  ) {}

  @Get()
  async list(
    @Res() res: Response,
    @Req() req: AppRequest,
    @Query('business_slug') businessSlug?: string,
  ) {
    return this.responseHandler.handle({
      method: () =>
        this.getCustomerPlansUseCase.execute({
          user: req.user,
          businessSlug,
        }),
      res,
    });
  }
}
