import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CustomerFirstAccessDto } from './dto/requests/customer-first-access.dto';
import { CustomerFirstAccessUseCase } from './use-cases';

@Controller('client/auth')
@ApiTags('Client Auth')
export class AuthController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly customerFirstAccessUseCase: CustomerFirstAccessUseCase,
  ) {}

  @Post('first-access')
  @ApiOperation({ summary: 'Customer First Access' })
  @IsPublic()
  async customerFirstAccess(
    @Res() res: Response,
    @Body() body: CustomerFirstAccessDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.customerFirstAccessUseCase.execute(body),
      res,
      successStatus: 201,
    });
  }
}
