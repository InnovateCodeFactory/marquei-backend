import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  DisconnectGoogleCalendarUseCase,
  GetGoogleCalendarAuthUrlUseCase,
  GetGoogleCalendarStatusUseCase,
  GoogleCalendarCallbackUseCase,
} from './use-cases';

@Controller('professional/integrations/google-calendar')
@ApiTags('Professional - Integrations - Google Calendar')
export class GoogleCalendarIntegrationsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getGoogleCalendarAuthUrlUseCase: GetGoogleCalendarAuthUrlUseCase,
    private readonly googleCalendarCallbackUseCase: GoogleCalendarCallbackUseCase,
    private readonly getGoogleCalendarStatusUseCase: GetGoogleCalendarStatusUseCase,
    private readonly disconnectGoogleCalendarUseCase: DisconnectGoogleCalendarUseCase,
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

  @Get('status')
  @ApiOperation({
    summary: 'Get Google Calendar integration status for current professional',
  })
  async getStatus(@Req() req: AppRequest, @Res() res: Response) {
    return this.responseHandler.handle({
      method: () => this.getGoogleCalendarStatusUseCase.execute(req),
      res,
    });
  }

  @Post('disconnect')
  @ApiOperation({
    summary: 'Disconnect Google Calendar integration for current professional',
  })
  async disconnect(@Req() req: AppRequest, @Res() res: Response) {
    return this.responseHandler.handle({
      method: () => this.disconnectGoogleCalendarUseCase.execute(req),
      res,
    });
  }

  @Get('callback')
  @ApiOperation({
    summary: 'Google OAuth2 callback for Calendar integration',
  })
  @IsPublic()
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const result = await this.googleCalendarCallbackUseCase.execute({
      code,
      state,
    });

    if (result.returnTo) {
      return res.redirect(result.returnTo);
    }

    return res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Marquei - Google Agenda</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background-color: #050816;
              color: #f9fafb;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .card {
              background: #0b1120;
              border-radius: 16px;
              padding: 24px;
              max-width: 360px;
              text-align: center;
              box-shadow: 0 10px 40px rgba(15, 23, 42, 0.8);
            }
            .title {
              font-size: 18px;
              margin-bottom: 8px;
            }
            .subtitle {
              font-size: 14px;
              color: #9ca3af;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              padding: 10px 18px;
              border-radius: 999px;
              border: none;
              background: linear-gradient(90deg, #6366f1, #ec4899);
              color: white;
              font-weight: 600;
              font-size: 14px;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1 class="title">Google Agenda conectada!</h1>
            <p class="subtitle">
              Você já pode voltar ao app Marquei. Esta janela pode ser fechada.
            </p>
            <button class="button" onclick="window.close()">Fechar</button>
          </div>
        </body>
      </html>
    `);
  }
}
