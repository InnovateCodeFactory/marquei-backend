import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { SendMailTypeEnum } from '@app/shared/enum';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MailService } from 'apps/api-gateway/src/shared/services';
import { Response } from 'express';
import { FirstAccessDto } from './dto/requests/firts-access.dto';
import { LoginDto } from './dto/requests/login.dto';
import { RefreshTokenDto } from './dto/requests/refresh-token.dto';
import { RegisterProfessionalUserDto } from './dto/requests/register-professional-user';
import { RegisterPushTokenDto } from './dto/requests/register-push-token.dto';
import { LoginUseCase, RegisterProfessionalUserUseCase } from './use-cases';
import { FirstAccessUseCase } from './use-cases/first-access.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { RegisterPushTokenUseCase } from './use-cases/register-push-token.use-case';

@Controller('professional/auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private readonly registerProfessionalUserUseCase: RegisterProfessionalUserUseCase,
    private readonly firstAccessUseCase: FirstAccessUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly registerPushTokenUseCase: RegisterPushTokenUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,

    private readonly responseHandler: ResponseHandlerService,
    private readonly mailService: MailService,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login user',
  })
  @IsPublic()
  async login(@Res() res: Response, @Body() body: LoginDto) {
    return this.responseHandler.handle({
      method: () => this.loginUseCase.execute(body),
      res,
    });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token (Professional)' })
  @IsPublic()
  async refresh(@Res() res: Response, @Body() body: RefreshTokenDto) {
    return this.responseHandler.handle({
      method: () => this.refreshTokenUseCase.execute(body),
      res,
    });
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
  @IsPublic()
  async logout(
    @Res() res: Response,
    @Body() body: { refreshToken?: string; allDevices?: boolean },
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () =>
        this.logoutUseCase.execute({
          refreshToken: body?.refreshToken,
          allDevices: body?.allDevices,
          userId: currentUser?.id,
        }),
      res,
    });
  }

  @Post('first-access')
  @ApiOperation({
    summary: 'First access user',
  })
  async firtsAccess(
    @Res() res: Response,
    @Body() body: FirstAccessDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.firstAccessUseCase.execute(body, currentUser.id),
      res,
    });
  }

  @Post('register-professional-user')
  @ApiOperation({
    summary: 'Register professional user',
  })
  @IsPublic()
  async registerProfessionalUser(
    @Res() res: Response,
    @Body() body: RegisterProfessionalUserDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.registerProfessionalUserUseCase.execute(body),
      res,
    });
  }

  @Post('register-push-token')
  @ApiOperation({
    summary: 'Register push token for notifications',
  })
  async registerPushToken(
    @Res() res: Response,
    @Body() body: RegisterPushTokenDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.registerPushTokenUseCase.execute(body, currentUser),
      res,
    });
  }

  @Post('send-validation-mail-code')
  @ApiOperation({
    summary: 'Send validation code to email',
  })
  @IsPublic()
  async sendValidationCode(
    @Res() res: Response,
    @Body() body: { email: string },
  ) {
    return this.responseHandler.handle({
      method: () =>
        this.mailService.sendCode({
          to: body.email,
          type: SendMailTypeEnum.CREATE_ACCOUNT_PROFESSIONAL,
        }),
      res,
    });
  }

  @Post('validate-code-mail')
  @ApiOperation({
    summary: 'Validate code sent to email',
  })
  @IsPublic()
  async validateCode(
    @Res() res: Response,
    @Body() body: { email: string; code: string },
  ) {
    return this.responseHandler.handle({
      method: () =>
        this.mailService.validateCode({
          email: body.email,
          code: body.code,
          type: SendMailTypeEnum.CREATE_ACCOUNT_PROFESSIONAL,
        }),
      res,
    });
  }
}
