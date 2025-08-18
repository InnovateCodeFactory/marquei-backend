import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateProfessionalDto } from './dto/requests/create-professional.dto';
import { GetProfessionalDto } from './dto/requests/get-professional.dto';
import {
  CreateProfessionalUseCase,
  GetProfessionalsUseCase,
} from './use-cases';

@Controller('professional/professionals')
@ApiTags('professionals')
export class ProfessionalsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getProfessionalsUseCase: GetProfessionalsUseCase,
    private readonly createProfessionalUseCase: CreateProfessionalUseCase,
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
}
