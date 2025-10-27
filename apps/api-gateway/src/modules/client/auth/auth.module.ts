import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import {
  CreateCustomerUseCase,
  CustomerFirstAccessUseCase,
  LoginUseCase,
} from './use-cases';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { RegisterVisitUseCase } from './use-cases/register-visit.use-case';

@Module({
  controllers: [AuthController],
  providers: [
    CustomerFirstAccessUseCase,
    CreateCustomerUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    RegisterVisitUseCase,
  ],
})
export class AuthModule {}
