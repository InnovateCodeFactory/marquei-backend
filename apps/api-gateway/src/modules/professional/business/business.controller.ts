import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SelectCurrentBusinessDto } from './dto/requests/select-current-business.dto';
import { GetBusinessByProfessionalUseCase } from './use-cases';
import { SelectCurrentBusinessUseCase } from './use-cases/select-current-business.use-case';

@Controller('professional/business')
@ApiTags('Business')
export class BusinessController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getBusinessByProfessionalUseCase: GetBusinessByProfessionalUseCase,
    private readonly selectCurrentBusinessUseCase: SelectCurrentBusinessUseCase,
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
}
