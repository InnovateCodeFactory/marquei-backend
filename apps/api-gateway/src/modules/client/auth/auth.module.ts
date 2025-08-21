import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { CustomerFirstAccessUseCase } from './use-cases';

@Module({
  controllers: [AuthController],
  providers: [CustomerFirstAccessUseCase],
})
export class AuthModule {}
