import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RegisterAppUpdateInteractionDto } from './dto/requests/register-app-update-interaction.dto';
import {
  GetAppUpdateModalUseCase,
  RegisterAppUpdateInteractionUseCase,
} from './use-cases';

@Controller('professional/app-updates')
@ApiTags('Professional - App Updates')
export class AppUpdatesController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getAppUpdateModalUseCase: GetAppUpdateModalUseCase,
    private readonly registerAppUpdateInteractionUseCase: RegisterAppUpdateInteractionUseCase,
  ) {}

  @Get('check')
  @ApiOperation({
    summary: 'Check if app update modal should be opened',
  })
  async check(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    const appVersion = getHeaderValue(req.headers['x-app-version']);
    const appOs = getHeaderValue(req.headers['x-app-os']);

    return this.responseHandler.handle({
      method: () =>
        this.getAppUpdateModalUseCase.execute(user, { appVersion, appOs }),
      res,
    });
  }

  @Post('interaction')
  @ApiOperation({
    summary: 'Register app update interaction',
  })
  async registerInteraction(
    @Body() body: RegisterAppUpdateInteractionDto,
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    const appVersion = getHeaderValue(req.headers['x-app-version']);
    const appOs = getHeaderValue(req.headers['x-app-os']);

    return this.responseHandler.handle({
      method: () =>
        this.registerAppUpdateInteractionUseCase.execute(body, user, {
          appVersion,
          appOs,
        }),
      res,
    });
  }
}

function getHeaderValue(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}
