import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { StatementController } from './statement.controller';
import { GetStatementUseCase } from './use-cases';

@Module({
  controllers: [StatementController],
  providers: [ResponseHandlerService, GetStatementUseCase],
})
export class StatementModule {}
