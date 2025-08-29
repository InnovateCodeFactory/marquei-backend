import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import {
  CreateCustomerUseCase,
  CustomerFirstAccessUseCase,
  LoginUseCase,
} from './use-cases';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';

@Module({
  controllers: [AuthController],
  providers: [
    CustomerFirstAccessUseCase,
    CreateCustomerUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
  ],
})
export class AuthModule {}
