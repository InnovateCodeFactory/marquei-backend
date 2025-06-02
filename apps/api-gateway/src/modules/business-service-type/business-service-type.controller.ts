import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetServiceTypesUseCase } from './use-cases';

@Controller('business-service-type')
@ApiTags('Business Service Type')
export class BusinessServiceTypeController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getServiceTypesUseCase: GetServiceTypesUseCase,
  ) {}

  @Get('get-service-types')
  @ApiOperation({
    summary: 'Get all business service types',
  })
  @IsPublic()
  async getServiceTypes(@Res() res: Response) {
    return await this.responseHandler.handle({
      method: () => this.getServiceTypesUseCase.execute(),
      res,
    });
  }
}
