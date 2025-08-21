import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateCustomerDto } from './dto/requests/create-customer.dto';
import { CustomerFirstAccessDto } from './dto/requests/customer-first-access.dto';
import {
  CreateCustomerUseCase,
  CustomerFirstAccessUseCase,
  LoginUseCase,
} from './use-cases';

@Controller('client/auth')
@ApiTags('Client Auth')
export class AuthController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly customerFirstAccessUseCase: CustomerFirstAccessUseCase,
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  @Post('first-access')
  @ApiOperation({ summary: 'Customer First Access' })
  @IsPublic()
  async customerFirstAccess(
    @Res() res: Response,
    @Body() body: CustomerFirstAccessDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.customerFirstAccessUseCase.execute(body),
      res,
      successStatus: 201,
    });
  }

  @Post('register')
  @ApiOperation({ summary: 'Register Customer' })
  @IsPublic()
  async createCustomer(@Res() res: Response, @Body() body: CreateCustomerDto) {
    return await this.responseHandler.handle({
      method: () => this.createCustomerUseCase.execute(body),
      res,
      successStatus: 201,
    });
  }

  @Post('login')
  @ApiOperation({ summary: 'Login Customer' })
  @IsPublic()
  async login(@Res() res: Response, @Body() body: any) {
    return await this.responseHandler.handle({
      method: () => this.loginUseCase.execute(body),
      res,
    });
  }
}
