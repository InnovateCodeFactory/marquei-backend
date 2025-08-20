import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import {
  CreateCustomerUseCase,
  CustomerFirstAccessUseCase,
  LoginUseCase,
} from './use-cases';

@Module({
  controllers: [AuthController],
  providers: [CustomerFirstAccessUseCase, CreateCustomerUseCase, LoginUseCase],
})
export class AuthModule {}
