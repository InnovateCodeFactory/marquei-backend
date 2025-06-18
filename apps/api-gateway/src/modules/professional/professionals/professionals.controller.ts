import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetProfessionalsUseCase } from './use-cases';

@Controller('professional/professionals')
@ApiTags('professionals')
export class ProfessionalsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getProfessionalsUseCase: GetProfessionalsUseCase,
  ) {}

  @Get('get-professionals')
  @ApiOperation({
    summary: 'Get all professionals',
    description:
      'Retrieve a list of all active professionals for the selected business.',
  })
  async getProfessionals(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getProfessionalsUseCase.execute(currentUser),
      res,
    });
  }
}
