import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import {
  CreatePortfolioFolderUseCase,
  DeletePortfolioItemUseCase,
  GetPortfolioFoldersUseCase,
  GetPortfolioUseCase,
  UploadPortfolioItemsUseCase,
} from './use-cases';

@Module({
  controllers: [PortfolioController],
  providers: [
    ResponseHandlerService,
    CreatePortfolioFolderUseCase,
    DeletePortfolioItemUseCase,
    GetPortfolioFoldersUseCase,
    UploadPortfolioItemsUseCase,
    GetPortfolioUseCase,
  ],
})
export class PortfolioModule {}
