import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Delete, Get, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateProfessionalDto } from './dto/requests/create-professional.dto';
import { GetProfessionalDto } from './dto/requests/get-professional.dto';
import { SoftDeleteProfessionalDto } from './dto/requests/soft-delete-professional.dto';
import { UpdateProfessionalDto } from './dto/requests/update-professional.dto';
import {
  CreateProfessionalUseCase,
  GetProfessionalsUseCase,
  SoftDeleteProfessionalUseCase,
  UpdateProfessionalUseCase,
} from './use-cases';

@Controller('professional/professionals')
@ApiTags('professionals')
export class ProfessionalsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getProfessionalsUseCase: GetProfessionalsUseCase,
    private readonly createProfessionalUseCase: CreateProfessionalUseCase,
    private readonly updateProfessionalUseCase: UpdateProfessionalUseCase,
    private readonly softDeleteProfessionalUseCase: SoftDeleteProfessionalUseCase,
  ) {}

  @Get('get-professionals')
  @ApiOperation({
    summary: 'Get all professionals',
    description:
      'Retrieve a list of all active professionals for the selected business.',
  })
  async getProfessionals(
    @Res() res: Response,
    @Query() query: GetProfessionalDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getProfessionalsUseCase.execute(query, currentUser),
      res,
    });
  }

  @Post('create-professional')
  @ApiOperation({
    summary: 'Create a new professional',
    description:
      'Create a new professional for the selected business. The professional will be active by default.',
  })
  async createProfessional(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() body: CreateProfessionalDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.createProfessionalUseCase.execute(body, currentUser),
      res,
    });
  }

  @Patch('update-professional')
  @ApiOperation({
    summary: 'Update a professional',
    description:
      'Update a professional for the selected business. Only changed fields will be updated.',
  })
  async updateProfessional(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() body: UpdateProfessionalDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.updateProfessionalUseCase.execute(body, currentUser),
      res,
    });
  }

  @Delete('soft-delete-professional')
  @ApiOperation({
    summary: 'Soft delete a professional',
    description:
      'Deactivate a professional by setting their status to INACTIVE. Validates that the professional has no future appointments and is not the business owner.',
  })
  async softDeleteProfessional(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() body: SoftDeleteProfessionalDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.softDeleteProfessionalUseCase.execute(body, currentUser),
      res,
      successStatus: 204,
    });
  }
}
