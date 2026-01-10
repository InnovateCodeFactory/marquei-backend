import { HashingService, ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CheckActiveSubscriptionUseCase } from '../plans/use-cases/check-active-subscription.use-case';
import { AuthController } from './auth.controller';
import {
  CreateAccountUseCase,
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

@Module({
  controllers: [AuthController],
  providers: [
    ResponseHandlerService,
    HashingService,
    JwtService,
    LoginUseCase,
    FirstAccessUseCase,
    CreateAccountUseCase,
    RegisterPushTokenUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    RequestPasswordResetUseCase,
    ValidatePasswordResetCodeUseCase,
    ResetPasswordUseCase,
    UpdatePasswordUseCase,
    UpdatePasswordConfirmCodeUseCase,

    // UseCases externos
    CheckActiveSubscriptionUseCase,
  ],
})
export class AuthModule {}
