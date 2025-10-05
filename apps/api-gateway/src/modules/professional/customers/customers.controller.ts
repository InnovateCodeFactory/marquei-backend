import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest, CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateCustomerDto } from './dto/requests/create-customer.dto';
import { UpdateCustomerDto } from './dto/requests/update-customer.dto';
import { FindCustomersDto } from './dto/requests/find-customers.dto';
import { GetCustomerDetailsDto } from './dto/requests/get-customer-details.dto';
import {
  CreateCustomerUseCase,
  FindCustomersUseCase,
  GetCustomerAppointmentsUseCase,
  GetCustomerDetailsUseCase,
  UpdateCustomerUseCase,
} from './use-cases';

@Controller('professional/customers')
@ApiTags('Customers')
export class CustomersController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly findCustomersUseCase: FindCustomersUseCase,
    private readonly getCustomerDetailsUseCase: GetCustomerDetailsUseCase,
    private readonly getCustomerAppointmentsUseCase: GetCustomerAppointmentsUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
  ) {}

  @Post('create-customer')
  @ApiOperation({
    summary: 'Create a new customer',
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
    summary: 'Find all customers for the current business',
  })
  async findCustomers(
    @Res() res: Response,
    @Req() req: AppRequest,
    @Query() query: FindCustomersDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.findCustomersUseCase.execute(query, req.user),
      res,
      successStatus: 200,
    });
  }

  @Get('details')
  @ApiOperation({
    summary: 'Get customer details by ID',
  })
  async getCustomerDetails(
    @Query() query: GetCustomerDetailsDto,
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getCustomerDetailsUseCase.execute(query, currentUser),
      res,
      successStatus: 200,
    });
  }

  @Get('appointments')
  @ApiOperation({
    summary: 'Get customer appointments by customer ID',
  })
  async getCustomerAppointments(
    @Query() query: GetCustomerDetailsDto,
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () =>
        this.getCustomerAppointmentsUseCase.execute(query, currentUser),
      res,
      successStatus: 200,
    });
  }

  @Post('update-customer')
  @ApiOperation({
    summary: 'Update a customer for current business',
  })
  async updateCustomer(
    @Body() body: UpdateCustomerDto,
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.updateCustomerUseCase.execute(body, currentUser),
      res,
      successStatus: 200,
    });
  }
}
