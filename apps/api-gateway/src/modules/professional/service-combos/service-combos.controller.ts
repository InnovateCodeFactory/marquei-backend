import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  CreateServiceComboDto,
  GetServiceCombosDto,
  UpdateServiceComboDto,
} from './dto/requests';
import {
  CreateServiceComboUseCase,
  DeleteServiceComboUseCase,
  GetServiceComboByIdUseCase,
  GetServiceCombosUseCase,
  UpdateServiceComboUseCase,
} from './use-cases';

@Controller('professional/service-combos')
@ApiTags('Professional - Service Combos')
export class ServiceCombosController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly createServiceComboUseCase: CreateServiceComboUseCase,
    private readonly getServiceCombosUseCase: GetServiceCombosUseCase,
    private readonly getServiceComboByIdUseCase: GetServiceComboByIdUseCase,
    private readonly updateServiceComboUseCase: UpdateServiceComboUseCase,
    private readonly deleteServiceComboUseCase: DeleteServiceComboUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar combo de serviços' })
  async create(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() dto: CreateServiceComboDto,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.createServiceComboUseCase.execute(currentUser, dto),
      res,
      successStatus: 201,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar combos de serviços' })
  async list(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Query() query: GetServiceCombosDto,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getServiceCombosUseCase.execute(currentUser, query),
      res,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar combo de serviços por ID' })
  async getById(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getServiceComboByIdUseCase.execute(currentUser, id),
      res,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar combo de serviços' })
  async update(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceComboDto,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () =>
        this.updateServiceComboUseCase.execute(currentUser, id, dto),
      res,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir combo de serviços (soft delete)' })
  async delete(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.deleteServiceComboUseCase.execute(currentUser, id),
      res,
      successStatus: 204,
    });
  }
}
