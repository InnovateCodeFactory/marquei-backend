import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  GetNotificationsUseCase,
  HasUnreadNotificationsUseCase,
} from './use-cases';

@Controller('professional/in-app-notifications')
@ApiTags('Professional In-App Notifications')
export class InAppNotificationsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly hasUnreadNotificationsUseCase: HasUnreadNotificationsUseCase,
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
  ) {}

  @Get('has-unread-notifications')
  @ApiOperation({
    summary: 'Check if the professional has unread notifications',
    description:
      'This endpoint checks if the professional has any unread in-app notifications.',
  })
  async hasUnreadNotifications(
    @Res() res: Response,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.hasUnreadNotificationsUseCase.execute(user),
      res,
    });
  }

  @Get('notifications')
  @ApiOperation({
    summary: 'Get all in-app notifications for the professional',
    description:
      'This endpoint retrieves all in-app notifications for the professional, including read and unread notifications.',
  })
  async getNotifications(
    @Res() res: Response,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getNotificationsUseCase.execute(user),
      res,
    });
  }
}
