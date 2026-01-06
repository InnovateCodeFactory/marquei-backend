import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { PAYMENT_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { ResponseHandlerService } from '@app/shared/services';
import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { RevenueCatWebhookGuard } from './revenuecat-webhook.guard';

@Controller('webhooks')
@IsPublic()
@SkipThrottle()
@ApiExcludeController()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
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
          routingKey: PAYMENT_QUEUES.WEBHOOKS.STRIPE_WEBHOOK_HANDLER_QUEUE,
        }),
      res,
    });
  }

  @Get('stripe/success')
  async handleStripeSuccess(@Res() res: Response) {
    return res.redirect('exp://192.168.15.84:8081/--/success');
  }

  @Post('revenuecat')
  @UseGuards(RevenueCatWebhookGuard)
  async handleRevenueCatWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
  ) {
    // public api key: appl_iBbJkerbAfseJLbJxVBSmtbHupH
    this.logger.debug(
      `Received RevenueCat webhook: ${JSON.stringify(body, null, 2)}`,
    );
    return await this.responseHandler.handle({
      method: () =>
        this.rmqService.publishToQueue({
          payload: body,
          routingKey: PAYMENT_QUEUES.WEBHOOKS.REVENUE_CAT_WEBHOOK_HANDLER_QUEUE,
        }),
      res,
    });
  }
}
