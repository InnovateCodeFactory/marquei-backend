import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AddFavoriteDto } from './dto/requests/add-favorite.dto';
import { GetFavoritesDto } from './dto/requests/get-favorites.dto';
import { RemoveFavoriteDto } from './dto/requests/remove-favorite.dto';
import {
  AddFavoriteUseCase,
  GetFavoriteKeysUseCase,
  GetFavoritesUseCase,
  RemoveFavoriteUseCase,
} from './use-cases';

@Controller('client/favorites')
@ApiTags('Clients - Favorites')
export class FavoritesController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly addFavoriteUseCase: AddFavoriteUseCase,
    private readonly removeFavoriteUseCase: RemoveFavoriteUseCase,
    private readonly getFavoritesUseCase: GetFavoritesUseCase,
    private readonly getFavoriteKeysUseCase: GetFavoriteKeysUseCase,
  ) {}

  @Post('add')
  @ApiOperation({ summary: 'Adicionar estabelecimento aos favoritos' })
  async addFavorite(
    @Body() dto: AddFavoriteDto,
    @Req() req: AppRequest,
    @Res() res: Response,
  ) {
    return this.responseHandler.handle({
      method: () => this.addFavoriteUseCase.execute(dto, req),
      res,
      successStatus: 201,
    });
  }

  @Delete('remove')
  @ApiOperation({ summary: 'Remover estabelecimento dos favoritos' })
  async removeFavorite(
    @Query() query: RemoveFavoriteDto,
    @Req() req: AppRequest,
    @Res() res: Response,
  ) {
    return this.responseHandler.handle({
      method: () => this.removeFavoriteUseCase.execute(query, req),
      res,
      successStatus: 200,
    });
  }

  @Get('list')
  @ApiOperation({
    summary: 'Listar favoritos do cliente (paginado e com busca)',
  })
  async listFavorites(
    @Query() query: GetFavoritesDto,
    @Req() req: AppRequest,
    @Res() res: Response,
  ) {
    return this.responseHandler.handle({
      method: () => this.getFavoritesUseCase.execute(query, req),
      res,
    });
  }

  @Get('keys')
  @ApiOperation({
    summary: 'Listar apenas ids e slugs dos favoritos do cliente',
  })
  async getFavoriteKeys(@Req() req: AppRequest, @Res() res: Response) {
    return this.responseHandler.handle({
      method: () => this.getFavoriteKeysUseCase.execute(req),
      res,
    });
  }
}
