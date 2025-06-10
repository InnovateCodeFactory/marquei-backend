import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetBusinessAvailableTimesDto } from './dto/requests/get-business-available-times.dto';
import { SelectCurrentBusinessDto } from './dto/requests/select-current-business.dto';
import { GetBusinessByProfessionalUseCase } from './use-cases';
import { GetBusinessAvailableTimesUseCase } from './use-cases/get-business-available-times.use-case';
import { SelectCurrentBusinessUseCase } from './use-cases/select-current-business.use-case';

@Controller('professional/business')
@ApiTags('Business')
export class BusinessController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getBusinessByProfessionalUseCase: GetBusinessByProfessionalUseCase,
    private readonly selectCurrentBusinessUseCase: SelectCurrentBusinessUseCase,
    private readonly getBusinessAvailableTimesUseCase: GetBusinessAvailableTimesUseCase,
  ) {}

  @Get('get-business-by-professional')
  @ApiOperation({
    summary: 'Get business by professional',
    description:
      'This endpoint retrieves the business associated with a professional.',
  })
  async getBusinessByProfessional(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getBusinessByProfessionalUseCase.execute(currentUser),
      res,
    });
  }

  @Post('select-current-business')
  @ApiOperation({
    summary: 'Select current business',
    description:
      'This endpoint allows a professional to select their current business.',
  })
  async selectCurrentBusiness(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() payload: SelectCurrentBusinessDto,
  ) {
    return await this.responseHandler.handle({
      method: () =>
        this.selectCurrentBusinessUseCase.execute(payload, currentUser),
      res,
    });
  }

  @Get('get-business-available-times')
  @ApiOperation({
    summary: 'Get business available times',
    description:
      'This endpoint retrieves the available times for a specific service in the business.',
  })
  async getBusinessAvailableTimes(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Query() query: GetBusinessAvailableTimesDto,
  ) {
    return await this.responseHandler.handle({
      method: () =>
        this.getBusinessAvailableTimesUseCase.execute(query, currentUser),
      res,
    });
  }
}
