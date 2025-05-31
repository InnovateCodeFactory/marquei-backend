import { HashingService, ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { LoginUseCase, RegisterProfessionalUserUseCase } from './use-cases';

@Module({
  controllers: [AuthController],
  providers: [
    ResponseHandlerService,
    HashingService,
    JwtService,
    LoginUseCase,
    RegisterProfessionalUserUseCase,
  ],
})
export class AuthModule {}
