import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import {
  CreatePortfolioFolderUseCase,
  DeletePortfolioFolderUseCase,
  DeletePortfolioItemUseCase,
  GetPortfolioFoldersUseCase,
  GetPortfolioUseCase,
  UpdatePortfolioFolderUseCase,
  UploadPortfolioItemsUseCase,
} from './use-cases';

@Module({
  controllers: [PortfolioController],
  providers: [
    ResponseHandlerService,
    CreatePortfolioFolderUseCase,
    DeletePortfolioFolderUseCase,
    DeletePortfolioItemUseCase,
    GetPortfolioFoldersUseCase,
    UploadPortfolioItemsUseCase,
    GetPortfolioUseCase,
    UpdatePortfolioFolderUseCase,
  ],
})
export class PortfolioModule {}
