import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ErrorResponseDto } from '@app/shared/dto/error-response.dto';
import { SuccessResponseDto } from '@app/shared/dto/success-response.dto';
import { SendMailTypeEnum, UserTypeEnum } from '@app/shared/enum';
import { EnvSchemaType } from '@app/shared/environment';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest, CurrentUser } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getCookieValue,
} from '@app/shared/utils/cookies';
import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MailValidationService } from 'apps/api-gateway/src/shared/services';
import { randomBytes } from 'crypto';
import { CookieOptions, Request, Response } from 'express';
import { RegisterPushTokenDto } from '../../client/auth/dto/requests/register-push-token.dto';
import { CreateAccountDto } from './dto/requests/create-account';
import { CreateWebSsoLinkDto } from './dto/requests/create-web-sso-link.dto';
import { FirstAccessDto } from './dto/requests/firts-access.dto';
import { ProfessionalForgotPasswordRequestDto } from './dto/requests/forgot-password-request.dto';
import { ForgotPasswordResetDto } from './dto/requests/forgot-password-reset.dto';
import { ForgotPasswordValidateDto } from './dto/requests/forgot-password-validate.dto';
import { LoginDto } from './dto/requests/login.dto';
import { RefreshTokenDto } from './dto/requests/refresh-token.dto';
import { UpdatePasswordConfirmCodeDto } from './dto/requests/update-password-confirm-code.dto';
import { UpdatePasswordDto } from './dto/requests/update-password.dto';
import { ValidateMailCodeDto } from './dto/requests/validate-mail-code.dto';
import {
  ConsumeWebSsoLinkUseCase,
  CreateAccountUseCase,
  CreateWebSsoLinkUseCase,
  FirstAccessUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  RegisterPushTokenUseCase,
  RequestPasswordResetUseCase,
  ResetPasswordUseCase,
  UpdatePasswordConfirmCodeUseCase,
  UpdatePasswordUseCase,
  ValidatePasswordResetCodeUseCase,
} from './use-cases';
import { getDefaultWebPortalUrl } from './use-cases/web-sso.utils';

@Controller('professional/auth')
@ApiTags('Professional - Auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService<EnvSchemaType>,
    private readonly responseHandler: ResponseHandlerService,
    private readonly mailService: MailValidationService,

    private readonly createAccountUseCase: CreateAccountUseCase,
    private readonly firstAccessUseCase: FirstAccessUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly createWebSsoLinkUseCase: CreateWebSsoLinkUseCase,
    private readonly consumeWebSsoLinkUseCase: ConsumeWebSsoLinkUseCase,
    private readonly registerPushTokenUseCase: RegisterPushTokenUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly validatePasswordResetCodeUseCase: ValidatePasswordResetCodeUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly updatePasswordUseCase: UpdatePasswordUseCase,
    private readonly updatePasswordConfirmCodeUseCase: UpdatePasswordConfirmCodeUseCase,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login user',
  })
  @IsPublic()
  async login(
    @Res() res: Response,
    @Req() req: Request,
    @Body() body: LoginDto,
  ) {
    const isWebClient = this.isWebClient(req);

    if (!isWebClient) {
      return this.responseHandler.handle({
        method: () => this.loginUseCase.execute(body),
        res,
      });
    }

    try {
      const data = await this.loginUseCase.execute(body);
      this.setAuthCookies(res, data?.token, data?.refresh_token);
      const { token, refresh_token, ...safeData } = data;

      res.status(200).json(new SuccessResponseDto({ data: safeData }));
      return;
    } catch (error) {
      res.status(error.status || 500).json(
        new ErrorResponseDto({
          message: error.message || 'Internal server error',
        }),
      );
      return;
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token (Professional)' })
  @IsPublic()
  async refresh(
    @Res() res: Response,
    @Req() req: Request,
    @Body() body: RefreshTokenDto,
  ) {
    const refreshToken =
      body?.refreshToken || getCookieValue(req, REFRESH_TOKEN_COOKIE);

    if (!refreshToken) {
      res.status(400).json(
        new ErrorResponseDto({
          message: 'Refresh token não fornecido',
        }),
      );
      return;
    }

    if (!this.isWebClient(req)) {
      return this.responseHandler.handle({
        method: () => this.refreshTokenUseCase.execute({ refreshToken }),
        res,
      });
    }

    try {
      const data = await this.refreshTokenUseCase.execute({ refreshToken });
      this.setAuthCookies(res, data?.token, data?.refresh_token);
      res.status(200).json(new SuccessResponseDto({ data: { success: true } }));
      return;
    } catch (error) {
      res.status(error.status || 500).json(
        new ErrorResponseDto({
          message: error.message || 'Internal server error',
        }),
      );
      return;
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
  @IsPublic()
  async logout(
    @Res() res: Response,
    @Req() req: Request,
    @Body() body: { refreshToken?: string; allDevices?: boolean },
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    const refreshToken =
      body?.refreshToken || getCookieValue(req, REFRESH_TOKEN_COOKIE);

    if (this.isWebClient(req)) {
      try {
        const data = await this.logoutUseCase.execute({
          refreshToken,
          allDevices: body?.allDevices,
          userId: currentUser?.id,
        });
        this.clearAuthCookies(res);
        res.status(200).json(new SuccessResponseDto({ data }));
        return;
      } catch (error) {
        res.status(error.status || 500).json(
          new ErrorResponseDto({
            message: error.message || 'Internal server error',
          }),
        );
        return;
      }
    }

    return this.responseHandler.handle({
      method: () =>
        this.logoutUseCase.execute({
          refreshToken,
          allDevices: body?.allDevices,
          userId: currentUser?.id,
        }),
      res,
    });
  }

  @Post('web-sso-link')
  @ApiOperation({
    summary:
      'Generate a one-time link to start a web session using the current professional login',
  })
  async createWebSsoLink(
    @Res() res: Response,
    @Req() req: Request,
    @Body() body: CreateWebSsoLinkDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    const consumeUrl = this.buildWebSsoConsumeUrl(req);

    return this.responseHandler.handle({
      method: () =>
        this.createWebSsoLinkUseCase.execute({
          userId: currentUser.id,
          consumeUrl,
          returnTo: body?.return_to,
        }),
      res,
    });
  }

  @Get('web-sso/consume')
  @ApiOperation({
    summary:
      'Consume one-time web SSO code, set web cookies, and redirect to web app',
  })
  @IsPublic()
  async consumeWebSsoCode(
    @Res() res: Response,
    @Query('code') code?: string,
  ) {
    const fallbackLoginUrl = this.buildWebLoginUrl({
      ssoStatus: 'invalid_or_expired',
    });

    try {
      const data = await this.consumeWebSsoLinkUseCase.execute({
        code: code || '',
      });
      this.setAuthCookies(res, data.accessToken, data.refreshToken);
      res.redirect(302, data.returnTo);
      return;
    } catch {
      this.clearAuthCookies(res);
      res.redirect(302, fallbackLoginUrl);
      return;
    }
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

  @Post('create-account')
  @ApiOperation({
    summary: 'Create professional user account',
  })
  @IsPublic()
  async registerProfessionalUser(
    @Res() res: Response,
    @Body() body: CreateAccountDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.createAccountUseCase.execute(body),
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

  @Post('forgot-password/request')
  @ApiOperation({ summary: 'Request password reset (Professional)' })
  @IsPublic()
  async requestPasswordReset(
    @Res() res: Response,
    @Body() body: ProfessionalForgotPasswordRequestDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.requestPasswordResetUseCase.execute(body),
      res,
    });
  }

  @Post('forgot-password/validate')
  @ApiOperation({ summary: 'Validate password reset code (Professional)' })
  @IsPublic()
  async validatePasswordResetCode(
    @Res() res: Response,
    @Body() body: ForgotPasswordValidateDto,
    @Req() req: AppRequest,
  ) {
    return this.responseHandler.handle({
      method: () => this.validatePasswordResetCodeUseCase.execute(body, req),
      res,
    });
  }

  @Post('forgot-password/reset')
  @ApiOperation({ summary: 'Reset password (Professional)' })
  @IsPublic()
  async resetPassword(
    @Res() res: Response,
    @Body() body: ForgotPasswordResetDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.resetPasswordUseCase.execute(body),
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

  private buildWebSsoConsumeUrl(req: Request): string {
    const requestOrigin = this.getRequestOrigin(req);
    return `${requestOrigin}/api/professional/auth/web-sso/consume`;
  }

  private buildWebLoginUrl({
    ssoStatus,
  }: {
    ssoStatus: 'invalid_or_expired';
  }): string {
    const defaultPortalUrl = getDefaultWebPortalUrl(this.configService);

    try {
      const loginUrl = new URL('/login', defaultPortalUrl);
      loginUrl.searchParams.set('sso', ssoStatus);
      return loginUrl.toString();
    } catch {
      return `${defaultPortalUrl.replace(/\/$/, '')}/login?sso=${ssoStatus}`;
    }
  }

  private getRequestOrigin(req: Request): string {
    const forwardedProto = this.getForwardedHeaderValue(
      req.headers['x-forwarded-proto'],
    );
    const forwardedHost = this.getForwardedHeaderValue(
      req.headers['x-forwarded-host'],
    );
    const protocol = forwardedProto || req.protocol || 'https';
    const host = forwardedHost || req.get('host');

    return host ? `${protocol}://${host}` : 'https://api.marquei.app.br';
  }

  private getForwardedHeaderValue(
    headerValue?: string | string[],
  ): string | undefined {
    const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!rawValue) return undefined;
    const firstValue = rawValue.split(',')[0]?.trim();
    return firstValue || undefined;
  }

  private isWebClient(req: Request): boolean {
    const header = req.headers['x-client-platform'];
    if (Array.isArray(header)) {
      return header.some((value) => value.toLowerCase() === 'web');
    }
    return header?.toLowerCase() === 'web';
  }

  private getCookieOptions(): CookieOptions {
    const sameSite = this.configService.get('WEB_COOKIE_SAMESITE') || 'lax';
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const secure = isProduction;
    const domain = isProduction
      ? this.configService.get('WEB_COOKIE_DOMAIN') || undefined
      : undefined;

    return {
      httpOnly: true,
      secure,
      sameSite: sameSite as CookieOptions['sameSite'],
      domain,
      path: '/',
    };
  }

  private getCsrfCookieOptions(): CookieOptions {
    return {
      ...this.getCookieOptions(),
      httpOnly: false,
    };
  }

  private setAuthCookies(
    res: Response,
    accessToken?: string,
    refreshToken?: string,
  ): void {
    const options = this.getCookieOptions();
    if (accessToken) {
      res.cookie(ACCESS_TOKEN_COOKIE, accessToken, options);
    }
    if (refreshToken) {
      res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, options);
    }
    this.setCsrfCookie(res);
  }

  private clearAuthCookies(res: Response): void {
    const options = this.getCookieOptions();
    res.clearCookie(ACCESS_TOKEN_COOKIE, options);
    res.clearCookie(REFRESH_TOKEN_COOKIE, options);
    res.clearCookie(CSRF_TOKEN_COOKIE, this.getCsrfCookieOptions());
  }

  private setCsrfCookie(res: Response): void {
    const token = randomBytes(32).toString('hex');
    res.cookie(CSRF_TOKEN_COOKIE, token, this.getCsrfCookieOptions());
  }
}
