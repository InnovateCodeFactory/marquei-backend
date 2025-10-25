import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { MarkNotificationAsReadDto } from './dto/mark-notification-as-read.dto';
import {
  GetNotificationsUseCase,
  HasUnreadNotificationsUseCase,
  MarkAllInAppNotificationsAsReadUseCase,
  MarkNotificationAsReadUseCase,
  ClearReadNotificationsUseCase,
} from './use-cases';
import { GetNotificationsDto } from './dto/get-notifications.dto';

@Controller('professional/in-app-notifications')
@ApiTags('Professional - In-App Notifications')
export class InAppNotificationsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly hasUnreadNotificationsUseCase: HasUnreadNotificationsUseCase,
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
    private readonly markAllInAppNotificationsAsReadUseCase: MarkAllInAppNotificationsAsReadUseCase,
    private readonly markNotificationAsReadUseCase: MarkNotificationAsReadUseCase,
    private readonly clearReadNotificationsUseCase: ClearReadNotificationsUseCase,
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
    @Query() query: GetNotificationsDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getNotificationsUseCase.execute(user, query),
      res,
    });
  }

  @Post('mark-all-as-read')
  @ApiOperation({
    summary: 'Mark all in-app notifications as read',
    description:
      'This endpoint marks all unread in-app notifications for the professional as read.',
  })
  async markAllAsRead(
    @Res() res: Response,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.markAllInAppNotificationsAsReadUseCase.execute(user),
      res,
    });
  }

  @Post('mark-as-read')
  @ApiOperation({
    summary: 'Mark a single in-app notification as read',
    description:
      'This endpoint marks a specific in-app notification as read for the professional.',
  })
  async markAsRead(
    @Res() res: Response,
    @Body() body: MarkNotificationAsReadDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.markNotificationAsReadUseCase.execute(body, user),
      res,
    });
  }

  @Post('clear-read')
  @ApiOperation({
    summary: 'Clear read notifications (hide)',
    description:
      'Marks all read in-app notifications as not visible for the professional.',
  })
  async clearRead(
    @Res() res: Response,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.clearReadNotificationsUseCase.execute(user),
      res,
    });
  }
}
