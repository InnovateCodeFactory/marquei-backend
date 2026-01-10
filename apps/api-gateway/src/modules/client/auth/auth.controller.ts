import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest, CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Headers, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateUserCustomerDto } from './dto/requests/create-customer.dto';
import { CustomerFirstAccessDto } from './dto/requests/customer-first-access.dto';
import { ForgotPasswordRequestDto } from './dto/requests/forgot-password-request.dto';
import { ForgotPasswordResetDto } from './dto/requests/forgot-password-reset.dto';
import { ForgotPasswordValidateDto } from './dto/requests/forgot-password-validate.dto';
import { RefreshTokenDto } from './dto/requests/refresh-token.dto';
import { RegisterVisitDto } from './dto/requests/register-visit.dto';
import { RegisterPushTokenDto } from './dto/requests/register-push-token.dto';
import {
  CreateCustomerUseCase,
  CustomerFirstAccessUseCase,
  LoginUseCase,
  RequestPasswordResetUseCase,
  ResetPasswordUseCase,
  ValidatePasswordResetCodeUseCase,
} from './use-cases';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { RegisterVisitUseCase } from './use-cases/register-visit.use-case';
import { RegisterPushTokenUseCase } from './use-cases/register-push-token.use-case';
import { RegisterGuestPushTokenUseCase } from './use-cases/register-guest-push-token.use-case';

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
    private readonly registerPushTokenUseCase: RegisterPushTokenUseCase,
    private readonly registerGuestPushTokenUseCase: RegisterGuestPushTokenUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly validatePasswordResetCodeUseCase: ValidatePasswordResetCodeUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
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
      method: () =>
        this.registerVisitUseCase.execute({ ...body, headerDeviceToken }),
      res,
      successStatus: 201,
    });
  }

  @Post('register-push-token')
  @ApiOperation({ summary: 'Register push token for notifications (customer)' })
  async registerPushToken(
    @Res() res: Response,
    @Body() body: RegisterPushTokenDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.registerPushTokenUseCase.execute(body, currentUser),
      res,
    });
  }

  @Post('register-guest-push-token')
  @ApiOperation({ summary: 'Register push token for notifications (guest)' })
  @IsPublic()
  async registerGuestPushToken(
    @Res() res: Response,
    @Body() body: RegisterPushTokenDto,
    @Headers('device-token') headerDeviceToken?: string,
  ) {
    return await this.responseHandler.handle({
      method: () =>
        this.registerGuestPushTokenUseCase.execute(body, headerDeviceToken),
      res,
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

  @Post('forgot-password/request')
  @ApiOperation({ summary: 'Request password reset (Customer)' })
  @IsPublic()
  async requestPasswordReset(
    @Res() res: Response,
    @Body() body: ForgotPasswordRequestDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.requestPasswordResetUseCase.execute(body),
      res,
    });
  }

  @Post('forgot-password/validate')
  @ApiOperation({ summary: 'Validate password reset code (Customer)' })
  @IsPublic()
  async validatePasswordResetCode(
    @Res() res: Response,
    @Body() body: ForgotPasswordValidateDto,
    @Req() req: AppRequest,
  ) {
    return await this.responseHandler.handle({
      method: () => this.validatePasswordResetCodeUseCase.execute(body, req),
      res,
    });
  }

  @Post('forgot-password/reset')
  @ApiOperation({ summary: 'Reset password (Customer)' })
  @IsPublic()
  async resetPassword(
    @Res() res: Response,
    @Body() body: ForgotPasswordResetDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.resetPasswordUseCase.execute(body),
      res,
    });
  }
}
