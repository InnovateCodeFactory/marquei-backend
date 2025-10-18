import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateServiceDto } from './dto/requests/create-service.dto';
import { DeleteServiceDto } from './dto/requests/delete-service.dto';
import { GetServicesDto } from './dto/requests/get-services.dto';
import { SoftDeleteServiceDto } from './dto/requests/soft-delete-service.dto';
import { UpdateServiceDto } from './dto/requests/update-service.dto';
import { CreateServiceUseCase, GetServicesUseCase, SoftDeleteServiceUseCase, UpdateServiceUseCase } from './use-cases';
import { DeleteServiceUseCase } from './use-cases/delete-service.use-case';

@Controller('professional/services')
@ApiTags('Services')
export class ServicesController {
  constructor(
    private readonly responseHandlerService: ResponseHandlerService,
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly getServicesUseCase: GetServicesUseCase,
    private readonly deleteServiceUseCase: DeleteServiceUseCase,
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    private readonly softDeleteServiceUseCase: SoftDeleteServiceUseCase,
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
    @Query() query: GetServicesDto = {},
  ) {
    return await this.responseHandlerService.handle({
      method: () => this.getServicesUseCase.execute(currentUser, query),
      res,
      successStatus: 200,
    });
  }

  @Delete('delete-service')
  @ApiOperation({
    summary: 'Delete a service',
  })
  async deleteService(
    @Res() res: Response,
    @Query() query: DeleteServiceDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandlerService.handle({
      method: () => this.deleteServiceUseCase.execute(query, currentUser),
      res,
      successStatus: 204,
    });
  }

  @Patch('update-service')
  @ApiOperation({
    summary: 'Update a service',
  })
  async updateService(
    @Res() res: Response,
    @Body() body: UpdateServiceDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandlerService.handle({
      method: () => this.updateServiceUseCase.execute(body, currentUser),
      res,
      successStatus: 200,
    });
  }

  @Delete('soft-delete-service')
  @ApiOperation({
    summary: 'Soft delete a service',
  })
  async softDeleteService(
    @Res() res: Response,
    @Body() body: SoftDeleteServiceDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandlerService.handle({
      method: () => this.softDeleteServiceUseCase.execute(body, currentUser),
      res,
      successStatus: 204,
    });
  }
}
