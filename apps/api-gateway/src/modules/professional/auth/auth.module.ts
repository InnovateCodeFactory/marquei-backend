import { HashingService, ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { LoginUseCase, RegisterProfessionalUserUseCase } from './use-cases';
import { FirstAccessUseCase } from './use-cases/first-access.use-case';
import { RegisterPushTokenUseCase } from './use-cases/register-push-token.use-case';

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
  ],
})
export class AuthModule {}
