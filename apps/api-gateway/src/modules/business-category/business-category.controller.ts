import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetCategoriesUseCase } from './use-cases';

@Controller('business-category')
@ApiTags('Business Category')
export class BusinessCategoryController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,

    private readonly getCategoriesUseCase: GetCategoriesUseCase,
  ) {}

  @Get('get-categories')
  @ApiOperation({
    summary: 'Get all business categories',
  })
  @IsPublic()
  async getCategories(@Res() res: Response) {
    return await this.responseHandler.handle({
      method: () => this.getCategoriesUseCase.execute(),
      res,
    });
  }
}
