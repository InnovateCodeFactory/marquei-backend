import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetAnalyticsDto } from './dto/requests/get-analytics.dto';
import { ProfessionalAnalyticsUseCase } from './use-cases';

@Controller('professional/analytics')
@ApiTags('Professional Analytics')
export class AnalyticsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getAnalyticsUseCase: ProfessionalAnalyticsUseCase,
  ) {}

  @Get('')
  @ApiOperation({ summary: 'Get professional analytics' })
  async getAnalytics(
    @Req() req: AppRequest,
    @Res() res: Response,
    @Query() query: GetAnalyticsDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.getAnalyticsUseCase.execute(query, req),
      res,
    });
  }
}
