import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { Body, Controller, Headers, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateUserCustomerDto } from './dto/requests/create-customer.dto';
import { CustomerFirstAccessDto } from './dto/requests/customer-first-access.dto';
import { RefreshTokenDto } from './dto/requests/refresh-token.dto';
import {
  CreateCustomerUseCase,
  CustomerFirstAccessUseCase,
  LoginUseCase,
} from './use-cases';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { RegisterVisitUseCase } from './use-cases/register-visit.use-case';
import { RegisterVisitDto } from './dto/requests/register-visit.dto';

@Controller('client/auth')
@ApiTags('Clients - Auth')
export class AuthController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly customerFirstAccessUseCase: CustomerFirstAccessUseCase,
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly registerVisitUseCase: RegisterVisitUseCase,
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
  async createCustomer(
    @Res() res: Response,
    @Body() body: CreateUserCustomerDto,
  ) {
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

  @Post('visit')
  @ApiOperation({ summary: 'Register device visit (UTC-3)' })
  @IsPublic()
  async registerVisit(
    @Res() res: Response,
    @Body() body: RegisterVisitDto,
    @Headers('device-token') headerDeviceToken?: string,
  ) {
    return await this.responseHandler.handle({
      method: () => this.registerVisitUseCase.execute({ ...body, headerDeviceToken }),
      res,
      successStatus: 201,
    });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token (Customer)' })
  @IsPublic()
  async refresh(@Res() res: Response, @Body() body: RefreshTokenDto) {
    return await this.responseHandler.handle({
      method: () => this.refreshTokenUseCase.execute(body),
      res,
    });
  }

  @Post('logout')
  @IsPublic()
  @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
  async logout(
    @Res() res: Response,
    @Body() body: { refreshToken?: string; allDevices?: boolean },
  ) {
    return await this.responseHandler.handle({
      method: () =>
        this.logoutUseCase.execute({
          refreshToken: body?.refreshToken,
        }),
      res,
    });
  }
}
