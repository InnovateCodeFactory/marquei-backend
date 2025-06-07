import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest, CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateCustomerDto } from './dto/requests/create-customer.dto';
import { CreateCustomerUseCase } from './use-cases';
import { FindCustomersUseCase } from './use-cases/find-customers.use-case';

@Controller('customers')
@ApiTags('Customers')
export class CustomersController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly findCustomersUseCase: FindCustomersUseCase,
  ) {}

  @Post('create-customer')
  @ApiOperation({
    description: 'Create a new customer',
  })
  async createCustomer(
    @Body() body: CreateCustomerDto,
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.createCustomerUseCase.execute(body, currentUser),
      res,
      successStatus: 201,
    });
  }

  @Get('find-customers')
  @ApiOperation({
    description: 'Find all customers for the current business',
  })
  async findCustomers(@Res() res: Response, @Req() req: AppRequest) {
    return await this.responseHandler.handle({
      method: () => this.findCustomersUseCase.execute(req.user),
      res,
      successStatus: 200,
    });
  }
}
