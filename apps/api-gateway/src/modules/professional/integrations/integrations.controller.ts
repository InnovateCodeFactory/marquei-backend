import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import { Controller, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetGoogleCalendarAuthUrlUseCase } from './use-cases';

@Controller('professional/integrations/google-calendar')
@ApiTags('Professional - Integrations - Google Calendar')
export class GoogleCalendarIntegrationsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getGoogleCalendarAuthUrlUseCase: GetGoogleCalendarAuthUrlUseCase,
  ) {}

  @Post('auth-url')
  @ApiOperation({
    summary: 'Get Google Calendar OAuth URL for current professional',
  })
  async getAuthUrl(@Req() req: AppRequest, @Res() res: Response) {
    return this.responseHandler.handle({
      method: () => this.getGoogleCalendarAuthUrlUseCase.execute(req),
      res,
    });
  }
}

