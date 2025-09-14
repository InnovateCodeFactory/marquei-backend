import { Body, Controller, Post, Req, Res } from '@nestjs/common';

import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SendPhoneValidationTokenDto } from './dto/requests/send-phone-validation-token.dto';
import { ValidatePhoneDto } from './dto/requests/validate-phone.dto';
import {
  SendPhoneValidationTokenUseCase,
  ValidatePhoneUseCase,
} from './use-cases';

@Controller('client/onboarding')
@ApiTags('Client Onboarding')
export class OnboardingController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly sendPhoneValidationTokenUseCase: SendPhoneValidationTokenUseCase,
    private readonly validatePhoneUseCase: ValidatePhoneUseCase,
  ) {}

  @Post('send-phone-validation-token')
  @ApiOperation({ summary: 'Send phone validation token' })
  @IsPublic()
  async sendPhoneValidationToken(
    @Body() dto: SendPhoneValidationTokenDto,
    @Res() res: Response,
  ) {
    return this.responseHandler.handle({
      method: () => this.sendPhoneValidationTokenUseCase.execute(dto),
      res,
    });
  }

  @Post('validate-phone')
  @ApiOperation({ summary: 'Validate phone' })
  @IsPublic()
  async validatePhone(
    @Body() dto: ValidatePhoneDto,
    @Res() res: Response,
    @Req() req: AppRequest,
  ) {
    return this.responseHandler.handle({
      method: () => this.validatePhoneUseCase.execute(dto, req),
      res,
    });
  }
}
