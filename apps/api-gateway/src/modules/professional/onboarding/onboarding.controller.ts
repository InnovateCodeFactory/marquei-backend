import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import { Response } from 'express';
import { SendPhoneValidationTokenDto } from './dto/requests/send-phone-validation-token.dto';
import { ValidatePhoneDto } from './dto/requests/validate-phone.dto';
import {
  SendMailValidationTokenUseCase,
  SendPhoneValidationTokenUseCase,
  ValidateMailUseCase,
  ValidatePhoneUseCase,
} from './use-cases';
import { SendMailValidationTokenDto } from './dto/requests/send-mail-validation-token.dto';

@Controller('professional/onboarding')
@ApiTags('Professional Onboarding')
export class OnboardingController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly sendPhoneValidationTokenUseCase: SendPhoneValidationTokenUseCase,
    private readonly validatePhoneUseCase: ValidatePhoneUseCase,
    private readonly sendMailValidationTokenUseCase: SendMailValidationTokenUseCase,
    private readonly validateMailUseCase: ValidateMailUseCase,
  ) {}

  @Post('send-phone-validation-token')
  @ApiOperation({ summary: 'Send phone validation token (Professional)' })
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
  @ApiOperation({ summary: 'Validate phone (Professional)' })
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

  @Post('send-mail-validation-token')
  @ApiOperation({ summary: 'Send mail validation token (Professional)' })
  @IsPublic()
  async sendMailValidationToken(
    @Body() dto: SendMailValidationTokenDto,
    @Res() res: Response,
  ) {
    return this.responseHandler.handle({
      method: () => this.sendMailValidationTokenUseCase.execute(dto),
      res,
    });
  }

  @Post('validate-mail')
  @ApiOperation({ summary: 'Validate mail (Professional)' })
  @IsPublic()
  async validateMail(
    @Body() dto: ValidatePhoneDto,
    @Res() res: Response,
    @Req() req: AppRequest,
  ) {
    return this.responseHandler.handle({
      method: () => this.validateMailUseCase.execute(dto, req),
      res,
    });
  }
}

