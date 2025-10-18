import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { MarkNotificationAsReadDto } from './dto/mark-notification-as-read.dto';
import { MarkNotificationAsReadUseCase } from './use-cases';

@Controller('client/in-app-notifications')
@ApiTags('Client In-App Notifications')
export class InAppNotificationsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly markNotificationAsReadUseCase: MarkNotificationAsReadUseCase,
  ) {}

  @Post('mark-as-read')
  @ApiOperation({
    summary: 'Mark a single in-app notification as read',
    description:
      'This endpoint marks a specific in-app notification as read for the client.',
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
}
