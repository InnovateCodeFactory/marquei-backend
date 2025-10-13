import { Module } from '@nestjs/common';
import { StatementController } from './statement.controller';
import {
  GetProfessionalStatementByIdUseCase,
  GetStatementUseCase,
} from './use-cases';

@Module({
  controllers: [StatementController],
  providers: [GetStatementUseCase, GetProfessionalStatementByIdUseCase],
})
export class StatementModule {}
