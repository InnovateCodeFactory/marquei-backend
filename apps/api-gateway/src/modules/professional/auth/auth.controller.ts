import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { SendMailTypeEnum, UserTypeEnum } from '@app/shared/enum';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest, CurrentUser } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MailValidationService } from 'apps/api-gateway/src/shared/services';
import { Response } from 'express';
import { FirstAccessDto } from './dto/requests/firts-access.dto';
import { LoginDto } from './dto/requests/login.dto';
import { RefreshTokenDto } from './dto/requests/refresh-token.dto';
import { RegisterProfessionalUserDto } from './dto/requests/register-professional-user';
import { RegisterPushTokenDto } from './dto/requests/register-push-token.dto';
import { UpdatePasswordConfirmCodeDto } from './dto/requests/update-password-confirm-code.dto';
import { UpdatePasswordDto } from './dto/requests/update-password.dto';
import { ValidateMailCodeDto } from './dto/requests/validate-mail-code.dto';
import {
  FirstAccessUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  RegisterProfessionalUserUseCase,
  RegisterPushTokenUseCase,
  UpdatePasswordConfirmCodeUseCase,
  UpdatePasswordUseCase,
} from './use-cases';

@Controller('professional/auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly mailService: MailValidationService,

    private readonly registerProfessionalUserUseCase: RegisterProfessionalUserUseCase,
    private readonly firstAccessUseCase: FirstAccessUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly registerPushTokenUseCase: RegisterPushTokenUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly updatePasswordUseCase: UpdatePasswordUseCase,
    private readonly updatePasswordConfirmCodeUseCase: UpdatePasswordConfirmCodeUseCase,
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
          user_type: UserTypeEnum.PROFESSIONAL,
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
    @Body() body: ValidateMailCodeDto,
    @Req() req: AppRequest,
  ) {
    const ip = getClientIp(req);
    const user_agent = req.headers['user-agent'];

    return this.responseHandler.handle({
      method: () =>
        this.mailService.validateCode({
          ip,
          user_agent,
          code: body.code,
          request_id: body.request_id,
        }),
      res,
    });
  }

  @Post('update-password')
  @ApiOperation({
    summary: 'Sends a validation token for the update password flow',
  })
  async updatePassword(
    @Res() res: Response,
    @Body() body: UpdatePasswordDto,
    @Req() req: AppRequest,
  ) {
    return this.responseHandler.handle({
      method: () => this.updatePasswordUseCase.execute(body, req),
      res,
    });
  }

  @Post('update-password-confirm-code')
  @ApiOperation({
    summary: 'Confirms the validation code and updates the password',
  })
  async updatePasswordConfirmCode(
    @Res() res: Response,
    @Body() body: UpdatePasswordConfirmCodeDto,
    @Req() req: AppRequest,
  ) {
    return this.responseHandler.handle({
      method: () => this.updatePasswordConfirmCodeUseCase.execute(body, req),
      res,
    });
  }
}
