import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { Body, Controller, Logger, Post, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('webhooks')
@IsPublic()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor() {}

  @Post('stripe')
  handleStripeWebhook(@Body() body: any, @Res() res: Response) {
    this.logger.debug(body);

    return res.status(200).json();
  }
}
