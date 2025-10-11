import { HashingService, ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
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

@Module({
  controllers: [AuthController],
  providers: [
    ResponseHandlerService,
    HashingService,
    JwtService,
    LoginUseCase,
    RegisterProfessionalUserUseCase,
    FirstAccessUseCase,
    RegisterPushTokenUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    UpdatePasswordUseCase,
    UpdatePasswordConfirmCodeUseCase,
  ],
})
export class AuthModule {}
