import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { STRIPE_WEBHOOK_HANDLER_QUEUE } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { ResponseHandlerService } from '@app/shared/services';
import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

@Controller('webhooks')
@IsPublic()
export class WebhooksController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,

    private readonly rmqService: RmqService,
  ) {}

  @Post('stripe')
  async handleStripeWebhook(@Req() req: Request, @Res() res: Response) {
    const payload = req.body; // raw body (Buffer)
    const signature = req.headers['stripe-signature'] as string;

    return await this.responseHandler.handle({
      method: () =>
        this.rmqService.publishToQueue({
          payload: {
            rawBody: payload.toString('utf8'), // envia como string
            signature,
          },
          routingKey: STRIPE_WEBHOOK_HANDLER_QUEUE,
        }),
      res,
    });
  }
}
