import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RegisterAppUpdateInteractionDto } from './dto/requests/register-app-update-interaction.dto';
import { RegisterAppReviewEventDto } from './dto/requests/register-app-review-event.dto';
import {
  GetHomeModalUseCase,
  GetAppReviewEligibilityUseCase,
  RegisterAppUpdateInteractionUseCase,
  RegisterAppReviewEventUseCase,
} from './use-cases';

@Controller('professional/home-modals')
@ApiTags('Professional - Home Modals')
export class HomeModalsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getHomeModalUseCase: GetHomeModalUseCase,
    private readonly registerAppUpdateInteractionUseCase: RegisterAppUpdateInteractionUseCase,
    private readonly getAppReviewEligibilityUseCase: GetAppReviewEligibilityUseCase,
    private readonly registerAppReviewEventUseCase: RegisterAppReviewEventUseCase,
  ) {}

  @Get('check')
  @ApiOperation({
    summary: 'Check if any home modal should be opened',
  })
  async check(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    const appVersion = getHeaderValue(req.headers['x-app-version']);
    const appOs = getHeaderValue(req.headers['x-app-os']);
    const appBuildNumberRaw = getHeaderValue(
      req.headers['x-app-build-number'],
    );
    const appBuildNumber = appBuildNumberRaw
      ? Number(appBuildNumberRaw)
      : undefined;

    return this.responseHandler.handle({
      method: () =>
        this.getHomeModalUseCase.execute(user, {
          appVersion,
          appOs,
          appBuildNumber: Number.isFinite(appBuildNumber)
            ? appBuildNumber
            : undefined,
        }),
      res,
    });
  }

  @Post('interaction')
  @ApiOperation({
    summary: 'Register home modal interaction',
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

  @Get('review-eligibility')
  @ApiOperation({
    summary: 'Check if review modal can be opened',
  })
  async reviewEligibility(
    @Res() res: Response,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return this.responseHandler.handle({
      method: () => this.getAppReviewEligibilityUseCase.execute(user),
      res,
    });
  }

  @Post('review-event')
  @ApiOperation({
    summary: 'Register app review event',
  })
  async registerReviewEvent(
    @Body() body: RegisterAppReviewEventDto,
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    const appVersion = getHeaderValue(req.headers['x-app-version']);

    return this.responseHandler.handle({
      method: () =>
        this.registerAppReviewEventUseCase.execute(body, user, {
          appVersion,
        }),
      res,
    });
  }
}

function getHeaderValue(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}
