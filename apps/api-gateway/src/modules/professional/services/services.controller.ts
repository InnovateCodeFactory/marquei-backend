import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateServiceDto } from './dto/requests/create-service.dto';
import { CreateServiceUseCase, GetServicesUseCase } from './use-cases';

@Controller('services')
@ApiTags('Services')
export class ServicesController {
  constructor(
    private readonly responseHandlerService: ResponseHandlerService,
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly getServicesUseCase: GetServicesUseCase,
  ) {}

  @Post('create-service')
  @ApiOperation({
    summary: 'Create a new service',
  })
  async createService(
    @Res() res: Response,
    @Body() body: CreateServiceDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandlerService.handle({
      method: () => this.createServiceUseCase.execute(body, currentUser),
      res,
      successStatus: 201,
    });
  }

  @Get('get-services')
  @ApiOperation({
    summary: 'Get all services for the current business',
  })
  async getServices(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandlerService.handle({
      method: () => this.getServicesUseCase.execute(currentUser),
      res,
      successStatus: 200,
    });
  }
}
