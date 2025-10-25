import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetReviewSummaryDto } from './dto/get-reviews-summary.dto';
import { GetReviewsDto } from './dto/get-reviews.dto';
import { RateBusinessDto } from './dto/rate-business.dto';
import {
  GetReviewSummaryUseCase,
  GetReviewsUseCase,
  RateBusinessUseCase,
} from './use-cases';

@Controller('client/business-rating')
@ApiTags('Clients - Business Rating')
export class BusinessRatingController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly rateBusinessUseCase: RateBusinessUseCase,
    private readonly getReviewsUseCase: GetReviewsUseCase,
    private readonly getReviewSummaryUseCase: GetReviewSummaryUseCase,
  ) {}
  // TODO: Refazer logica de criar profissional com conta
  @Post('rate')
  @ApiOperation({ summary: 'Avaliar um estabelecimento' })
  async rateBusiness(
    @Body() dto: RateBusinessDto,
    @Req() req: AppRequest,
    @Res() res: Response,
  ) {
    return this.responseHandler.handle({
      method: () => this.rateBusinessUseCase.execute(dto, req),
      res,
      successStatus: 201,
    });
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Obter avaliações de um estabelecimento' })
  @IsPublic()
  async getReviews(@Query() query: GetReviewsDto, @Res() res: Response) {
    return this.responseHandler.handle({
      method: () => this.getReviewsUseCase.execute(query),
      res,
    });
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Obter resumo das avaliações de um estabelecimento',
  })
  @IsPublic()
  async getReviewSummary(
    @Query() query: GetReviewSummaryDto,
    @Res() res: Response,
  ) {
    return this.responseHandler.handle({
      method: () => this.getReviewSummaryUseCase.execute(query),
      res,
    });
  }
}
