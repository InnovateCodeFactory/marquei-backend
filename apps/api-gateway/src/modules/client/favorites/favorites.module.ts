import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller';
import {
  AddFavoriteUseCase,
  GetFavoriteKeysUseCase,
  GetFavoritesUseCase,
  RemoveFavoriteUseCase,
} from './use-cases';

@Module({
  controllers: [FavoritesController],
  providers: [
    AddFavoriteUseCase,
    RemoveFavoriteUseCase,
    GetFavoritesUseCase,
    GetFavoriteKeysUseCase,
  ],
})
export class FavoritesModule {}
