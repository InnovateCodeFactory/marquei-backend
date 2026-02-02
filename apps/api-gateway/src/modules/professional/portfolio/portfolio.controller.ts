import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreatePortfolioFolderDto, UploadPortfolioItemsDto } from './dto/requests';
import {
  CreatePortfolioFolderUseCase,
  DeletePortfolioItemUseCase,
  GetPortfolioFoldersUseCase,
  GetPortfolioUseCase,
  UploadPortfolioItemsUseCase,
} from './use-cases';

@Controller('professional/portfolio')
@ApiTags('Professional - Portfolio')
export class PortfolioController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly createFolderUseCase: CreatePortfolioFolderUseCase,
    private readonly getFoldersUseCase: GetPortfolioFoldersUseCase,
    private readonly uploadItemsUseCase: UploadPortfolioItemsUseCase,
    private readonly getPortfolioUseCase: GetPortfolioUseCase,
    private readonly deleteItemUseCase: DeletePortfolioItemUseCase,
  ) {}

  @Post('folders')
  @ApiOperation({ summary: 'Create portfolio folder' })
  async createFolder(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() dto: CreatePortfolioFolderDto,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.createFolderUseCase.execute(user, dto),
      res,
      successStatus: 201,
    });
  }

  @Get('folders')
  @ApiOperation({ summary: 'Get portfolio folders' })
  async getFolders(
    @CurrentUserDecorator() user: CurrentUser,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getFoldersUseCase.execute(user),
      res,
    });
  }

  @Post('items')
  @UseInterceptors(
    FilesInterceptor('files', 30, {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype))
          return cb(new Error('Tipo inválido'), false);
        cb(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload portfolio images' })
  async uploadItems(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUserDecorator() user: CurrentUser,
    @Body() dto: UploadPortfolioItemsDto,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.uploadItemsUseCase.execute(user, files, dto),
      res,
      successStatus: 201,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get portfolio organized by folders' })
  async getPortfolio(
    @CurrentUserDecorator() user: CurrentUser,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getPortfolioUseCase.execute(user),
      res,
    });
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Delete portfolio item' })
  async deleteItem(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.deleteItemUseCase.execute(user, id),
      res,
    });
  }
}
