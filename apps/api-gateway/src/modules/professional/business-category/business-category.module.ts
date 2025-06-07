import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { BusinessCategoryController } from './business-category.controller';
import { GetCategoriesUseCase } from './use-cases';

@Module({
  controllers: [BusinessCategoryController],
  providers: [ResponseHandlerService, GetCategoriesUseCase],
})
export class BusinessCategoryModule {}
